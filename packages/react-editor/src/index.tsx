"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { EditorState, Transaction } from '@inkstream/pm/state';
import { EditorView } from '@inkstream/pm/view';
import { DOMParser, DOMSerializer, Schema } from '@inkstream/pm/model';
import { inkstreamSchema, PluginManager, Plugin, availablePlugins, inkstreamPlugins, ToolbarItem, LicenseManager, buildInputRules, buildKeymap } from '@inkstream/editor-core';
import { getLinkBubbleToolbarItem } from '@inkstream/link-bubble';
import { Toolbar } from './Toolbar';
import './editor.css';
import { ImageNodeView } from './ImageNodeView';
import { useLicenseValidation } from './useLicenseValidation';
import { createRoot } from 'react-dom/client';

// Stable module-level defaults to prevent new object/array references on
// every render, which would cause useEffect to re-run infinitely.
const DEFAULT_PLUGINS = Object.values(availablePlugins);
const DEFAULT_PLUGIN_OPTIONS: { [key: string]: any } = {};
const DEFAULT_TOOLBAR_LAYOUT: string[] = [];

/** Controls which colour scheme the editor uses. */
export type ThemeMode = 'auto' | 'light' | 'dark';

interface RichTextEditorProps {
  initialContent: string;
  plugins?: Plugin[];  // Now accepts Plugin instances instead of string IDs
  pluginOptions?: { [key: string]: any };
  toolbarLayout?: string[];
  licenseKey?: string;
  /**
   * URL of your server-side license validation endpoint.
   * Without this, the editor only ever uses free-tier plugins regardless of licenseKey.
   */
  licenseValidationEndpoint?: string;
  onLicenseError?: (plugin: Plugin, tier: string) => void; // Callback when a plugin requires a higher tier
  /** Called with the EditorView instance once the editor is ready. */
  onEditorReady?: (view: EditorView) => void;
  /**
   * Called whenever the document content changes.
   * Receives the current content serialized as an HTML string.
   */
  onChange?: (html: string) => void;
  /**
   * Controls the colour scheme: 'auto' follows the OS, 'light' forces light,
   * 'dark' forces dark. Defaults to 'auto'.
   *
   * Pass this prop to control theme from outside. Omit it (with showThemeToggle)
   * to let users switch the theme through the built-in toolbar toggle.
   */
  theme?: ThemeMode;
  /**
   * When true, adds a theme-toggle button to the right end of the toolbar so
   * users can switch between Auto / Light / Dark without any extra wiring.
   */
  showThemeToggle?: boolean;
  /** Called whenever the theme changes (both via the built-in toggle and via prop). */
  onThemeChange?: (theme: ThemeMode) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  initialContent, 
  plugins = DEFAULT_PLUGINS,
  pluginOptions = DEFAULT_PLUGIN_OPTIONS,
  toolbarLayout = DEFAULT_TOOLBAR_LAYOUT,
  licenseKey,
  licenseValidationEndpoint,
  onLicenseError,
  onEditorReady,
  onChange,
  theme,
  showThemeToggle = false,
  onThemeChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null); // Use ref for EditorView instance
  const [currentEditorState, setCurrentEditorState] = useState<EditorState | null>(null); // State for React to react to
  type ToolbarItemOrSeparator = ToolbarItem | string;

  const [toolbarItems, setToolbarItems] = useState<ToolbarItemOrSeparator[]>([]);

  // Theme state — uncontrolled when `theme` prop is not provided; syncs when it is.
  const [internalTheme, setInternalTheme] = useState<ThemeMode>(theme ?? 'auto');

  // Sync controlled theme prop → internal state
  useEffect(() => {
    if (theme !== undefined) setInternalTheme(theme);
  }, [theme]);

  const handleThemeChange = useCallback((next: ThemeMode) => {
    setInternalTheme(next);
    onThemeChange?.(next);
  }, [onThemeChange]);

  const wrapperClass = [
    'inkstream-editor-wrapper',
    internalTheme === 'dark' ? 'inkstream-dark' : '',
    internalTheme === 'light' ? 'inkstream-light' : '',
  ].filter(Boolean).join(' ');
  
  // Server-validated tier. Always 'free' until the validation endpoint confirms otherwise.
  const { tier: validatedTier } = useLicenseValidation({ licenseKey, validationEndpoint: licenseValidationEndpoint });
  
  // Filter plugins based on server-validated tier only
  const validatedPlugins = useMemo(() => {
    const validated = plugins.filter(plugin => {
      const pluginTier = plugin.tier || 'free';
      const canUse = LicenseManager.canTierAccess(validatedTier, pluginTier);
      
      if (!canUse) {
        console.warn(`Plugin "${plugin.name}" requires ${pluginTier} tier but user has ${validatedTier} tier`);
        if (onLicenseError) {
          onLicenseError(plugin, pluginTier);
        }
        return false;
      }
      
      return true;
    });
    
    return validated;
  }, [plugins, validatedTier, onLicenseError]);
  
  // Create plugin state - recalculates when validatedPlugins change
  const pluginState = useMemo(() => {
    // Create plugin manager and register all plugins
    const manager = new PluginManager();
    validatedPlugins.forEach(plugin => manager.registerPlugin(plugin));
    
    // Create schema from the manager
    const editorSchema = inkstreamSchema(manager);
    
    // Build ProseMirror plugins - do NOT call inkstreamPlugins() which creates a duplicate manager!
    // Instead, build plugins directly from this manager instance
    const pmPlugins = [
      ...manager.getProseMirrorPlugins(editorSchema),
      buildInputRules(editorSchema),
      buildKeymap(editorSchema, manager),
    ];

    return {
      validatedPlugins,
      pluginManager: manager,
      schema: editorSchema,
      proseMirrorPlugins: pmPlugins,
    };
  }, [validatedPlugins]);

  const { pluginManager, schema, proseMirrorPlugins } = pluginState;

  // Keep a ref so handleDispatchTransaction never needs onChange in its dep array.
  // This prevents the chain: onChange change → new handleDispatchTransaction → useEffect re-run → editor destroyed.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  // This function will be passed to EditorView and will be responsible for updating ProseMirror's state
  // and then reflecting that change in React's state.
  const handleDispatchTransaction = useCallback((transaction: Transaction) => {
    if (editorViewRef.current) {
      const newState = editorViewRef.current.state.apply(transaction);
      editorViewRef.current.updateState(newState);
      setCurrentEditorState(newState);
      if (onChangeRef.current && transaction.docChanged) {
        const div = document.createElement('div');
        const fragment = DOMSerializer.fromSchema(newState.schema).serializeFragment(newState.doc.content);
        div.appendChild(fragment);
        onChangeRef.current(div.innerHTML);
      }
    }
  }, []); // stable — reads onChange via ref, not closure

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    // Parse initial content from HTML string
    let doc;
    try {
      const parser = DOMParser.fromSchema(schema);
      const domDoc = new window.DOMParser().parseFromString(initialContent, "text/html");
      doc = parser.parse(domDoc.body);
    } catch (error) {
      console.warn("Failed to parse initial content, using empty doc:", error);
      // Fallback to empty document
      doc = schema.node("doc", null, [schema.node("paragraph")]);
    }

    const state = EditorState.create({
      schema: schema,
      doc: doc,
      plugins: proseMirrorPlugins,
    });

    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction: handleDispatchTransaction,
      nodeViews: {
        image: (node, view, getPos) => new class {
          dom: HTMLDivElement;
          root: any;

          constructor() {
            this.dom = document.createElement('div');
            this.dom.classList.add('image-node-view-wrapper');
            this.root = createRoot(this.dom);
            this.render(node, view, getPos);
          }

          render(node: any, view: any, getPos: any) {
            this.root.render(
              <ImageNodeView node={node} view={view} getPos={getPos} />
            );
          }

          update(newNode: any) {
            if (newNode.type !== node.type) return false;
            this.render(newNode, view, getPos);
            return true;
          }

          destroy() {
            this.root.unmount();
          }
        }()
      }
    });

    editorViewRef.current = view;
    setCurrentEditorState(state);
    onEditorReady?.(view);

    // Get all available toolbar items
    const allToolbarItems = pluginManager.getToolbarItems(schema, pluginOptions);
    allToolbarItems.set('link', getLinkBubbleToolbarItem(schema));
    let orderedToolbarItems: ToolbarItemOrSeparator[] = [];

    if (toolbarLayout && toolbarLayout.length > 0) {
      // If a layout is provided, use it to order the items
      for (const itemId of toolbarLayout) {
        if (itemId === '|') {
          orderedToolbarItems.push(itemId); // Add separator directly
        } else {
          const item = allToolbarItems.get(itemId);
          if (item) {
            orderedToolbarItems.push(item);
          }
        }
      }
    } else {
      // Otherwise, use the default order (values from the map)
      orderedToolbarItems = Array.from(allToolbarItems.values());
    }

    // console.log("Toolbar items collected:", orderedToolbarItems);
    // console.log("Toolbar items collected:", orderedToolbarItems);
    setToolbarItems(orderedToolbarItems);

    // Cleanup function for EditorView when component unmounts or plugins change
    return () => {
      if (editorViewRef.current) {
        editorViewRef.current.destroy();
        editorViewRef.current = null;
        setCurrentEditorState(null);
      }
    };
  }, [schema, proseMirrorPlugins, pluginManager, validatedPlugins, plugins, validatedTier, initialContent, handleDispatchTransaction, pluginOptions, toolbarLayout]); // Reinitialize when plugins or validated tier changes

  return (
    <div className={wrapperClass}>
      <Toolbar
        editorState={currentEditorState}
        editorDispatch={editorViewRef.current ? editorViewRef.current.dispatch : null}
        editorView={editorViewRef.current}
        toolbarItems={toolbarItems}
        themeMode={showThemeToggle ? internalTheme : undefined}
        onThemeChange={showThemeToggle ? handleThemeChange : undefined}
      />
      <div ref={editorRef} className="inkstream-editor" />
    </div>
  );
};

export * from './EditorWithTableDialog';
export { TablePropertiesDialog } from './TablePropertiesDialog';
export type { } from './TablePropertiesDialog';
export { useLazyPlugins } from './useLazyPlugins';
export { useLicenseValidation } from './useLicenseValidation';
export type { UseLicenseValidationOptions, UseLicenseValidationResult } from './useLicenseValidation';
