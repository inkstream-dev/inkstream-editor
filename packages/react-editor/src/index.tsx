"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { EditorState, Transaction } from '@inkstream/pm/state';
import { EditorView } from '@inkstream/pm/view';
import { DOMParser, DOMSerializer, Schema } from '@inkstream/pm/model';
import { inkstreamSchema, PluginManager, Plugin, inkstreamPlugins, ToolbarItem, LicenseManager, buildInputRules, buildKeymap, buildPastePlugin, CommandChain, ChainedCommands } from '@inkstream/editor-core';
import { availablePlugins } from '@inkstream/starter-kit';
import { getLinkBubbleToolbarItem } from '@inkstream/link-bubble';
import { Toolbar } from './Toolbar';
import './editor.css';
import { ImageNodeView } from './ImageNodeView';
import { useLicenseValidation } from './useLicenseValidation';
import { EditorStateStore } from './useEditorState';
import { createRoot } from 'react-dom/client';

// Stable module-level defaults to prevent new object/array references on
// every render, which would cause useEffect to re-run infinitely.
const DEFAULT_PLUGINS = Object.values(availablePlugins);
const DEFAULT_PLUGIN_OPTIONS: { [key: string]: Record<string, unknown> } = {};
const DEFAULT_TOOLBAR_LAYOUT: string[] = [];

/** Controls which colour scheme the editor uses. */
export type ThemeMode = 'auto' | 'light' | 'dark';

/**
 * Ref handle returned by `<RichTextEditor ref={...} />`.
 *
 * Provides programmatic access to the editor's command API:
 *
 * ```tsx
 * const editorRef = useRef<EditorRef>(null);
 *
 * // Execute commands
 * editorRef.current?.chain().toggleBold().focus().run();
 *
 * // Dry-run check (no state mutation)
 * const canBold = editorRef.current?.can().toggleBold().run();
 * ```
 */
export interface EditorRef {
  /**
   * Build a chainable command chain. Commands are executed sequentially
   * when `.run()` is called.
   */
  chain(): ChainedCommands;
  /**
   * Build a dry-run chain. Commands test feasibility (dispatch is undefined)
   * and never mutate editor state. Returns `true` if all commands would succeed.
   */
  can(): ChainedCommands;
  /** Direct access to the live EditorView, or `null` before the editor mounts. */
  getView(): EditorView | null;
}

interface RichTextEditorProps {
  initialContent: string;
  plugins?: Plugin[];  // Now accepts Plugin instances instead of string IDs
  pluginOptions?: { [key: string]: Record<string, unknown> };
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

export const RichTextEditor = forwardRef<EditorRef, RichTextEditorProps>(function RichTextEditor({ 
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
}, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  // Per-transaction notification store — toolbar buttons subscribe to this
  // instead of receiving editorState as a React prop on every keystroke.
  const storeRef = useRef<EditorStateStore | null>(null);
  // React state for the EditorView instance — triggers re-render once on mount/unmount
  // so that the Toolbar receives a non-null editorView prop after initialization.
  const [editorView, setEditorView] = useState<EditorView | null>(null);
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
      buildPastePlugin(manager.getPasteRules(editorSchema)),
    ];

    return {
      validatedPlugins,
      pluginManager: manager,
      schema: editorSchema,
      proseMirrorPlugins: pmPlugins,
    };
  }, [validatedPlugins]);

  const { pluginManager, schema, proseMirrorPlugins } = pluginState;

  // Keep refs so callbacks are never stale without appearing in effect dep arrays.
  // This prevents: prop change → new callback identity → effect re-run → editor destroyed.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  const onEditorReadyRef = useRef(onEditorReady);
  useEffect(() => { onEditorReadyRef.current = onEditorReady; });

  // Stable ref to the current set of validated plugins so lifecycle hooks
  // (onUpdate, onFocus, onBlur) can be called from stable callbacks without
  // appearing in their dependency arrays.
  const validatedPluginsRef = useRef<Plugin[]>(validatedPlugins);
  useEffect(() => { validatedPluginsRef.current = validatedPlugins; });

  // This function will be passed to EditorView and will be responsible for updating ProseMirror's state
  // and then notifying the store so subscribed toolbar buttons can re-render independently.
  const handleDispatchTransaction = useCallback((transaction: Transaction) => {
    if (editorViewRef.current) {
      const prevState = editorViewRef.current.state;
      const newState = prevState.apply(transaction);
      editorViewRef.current.updateState(newState);
      // Notify all subscribers (toolbar buttons) — each decides independently
      // whether to re-render based on their selector's return value.
      storeRef.current?.update(newState);
      // Call onUpdate lifecycle hooks for all active plugins.
      validatedPluginsRef.current.forEach(p =>
        p.onUpdate?.({ view: editorViewRef.current!, state: newState, prevState, tr: transaction })
      );
      if (onChangeRef.current && transaction.docChanged) {
        const div = document.createElement('div');
        const fragment = DOMSerializer.fromSchema(newState.schema).serializeFragment(newState.doc.content);
        div.appendChild(fragment);
        onChangeRef.current(div.innerHTML);
      }
    }
  }, []); // stable — reads everything via refs, not closures

  // Effect 1 — EditorView lifecycle.
  // Creates and destroys the ProseMirror editor instance.
  // Depends ONLY on what actually requires a new EditorView:
  //   schema, plugins, initial content, and the stable dispatch function.
  // toolbarLayout / pluginOptions changes do NOT belong here and will NOT
  // cause the editor to be torn down and recreated.
  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    // Create a fresh store for this EditorView lifetime.
    const store = new EditorStateStore();
    storeRef.current = store;

    // SSR guard — this effect only runs on the client, but be explicit.
    if (typeof window === 'undefined') return;

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
      handleDOMEvents: {
        focus: (v, event) => {
          validatedPluginsRef.current.forEach(p => p.onFocus?.({ view: v, event }));
          return false;
        },
        blur: (v, event) => {
          validatedPluginsRef.current.forEach(p => p.onBlur?.({ view: v, event }));
          return false;
        },
      },
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
    // Seed the store with the initial state so buttons render correctly
    // before the first transaction fires.
    store.update(state);
    // Trigger one React re-render so Toolbar receives editorView prop.
    setEditorView(view);
    onEditorReadyRef.current?.(view);
    // Call onCreate lifecycle hooks for all active plugins.
    pluginState.validatedPlugins.forEach(p => p.onCreate?.({ view }));

    // Destroy the EditorView when schema/plugins change or component unmounts.
    return () => {
      // Call onDestroy lifecycle hooks before tearing down the editor.
      pluginState.validatedPlugins.forEach(p => p.onDestroy?.());
      if (editorViewRef.current) {
        editorViewRef.current.destroy();
        editorViewRef.current = null;
        storeRef.current = null;
        setEditorView(null);
      }
    };
  }, [schema, proseMirrorPlugins, initialContent, handleDispatchTransaction]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2 — Toolbar construction.
  // Builds toolbar items and applies toolbarLayout ordering.
  // This effect runs independently of the EditorView — changing toolbarLayout
  // or pluginOptions only re-runs this effect, never recreating the editor.
  useEffect(() => {
    const allToolbarItems = pluginManager.getToolbarItems(schema, pluginOptions);
    allToolbarItems.set('link', getLinkBubbleToolbarItem(schema));
    let orderedToolbarItems: ToolbarItemOrSeparator[] = [];

    if (toolbarLayout && toolbarLayout.length > 0) {
      for (const itemId of toolbarLayout) {
        if (itemId === '|') {
          orderedToolbarItems.push(itemId);
        } else {
          const item = allToolbarItems.get(itemId);
          if (item) {
            orderedToolbarItems.push(item);
          }
        }
      }
    } else {
      orderedToolbarItems = Array.from(allToolbarItems.values());
    }

    setToolbarItems(orderedToolbarItems);
  }, [pluginManager, schema, pluginOptions, toolbarLayout]);

  // Expose chain() / can() / getView() on the forwarded ref.
  useImperativeHandle(ref, () => ({
    chain(): ChainedCommands {
      return new CommandChain(
        () => editorViewRef.current,
        pluginManager.getCommands(),
        false,
      ) as ChainedCommands;
    },
    can(): ChainedCommands {
      return new CommandChain(
        () => editorViewRef.current,
        pluginManager.getCommands(),
        true,
      ) as ChainedCommands;
    },
    getView(): EditorView | null {
      return editorViewRef.current;
    },
  }), [pluginManager]);

  return (
    <div className={wrapperClass}>
      <Toolbar
        store={storeRef.current}
        editorView={editorView}
        toolbarItems={toolbarItems}
        themeMode={showThemeToggle ? internalTheme : undefined}
        onThemeChange={showThemeToggle ? handleThemeChange : undefined}
      />
      <div ref={editorRef} className="inkstream-editor" />
    </div>
  );
});

export * from './EditorWithTableDialog';
export { TablePropertiesDialog } from './TablePropertiesDialog';
export type { } from './TablePropertiesDialog';
export { useLazyPlugins } from './useLazyPlugins';
export { useLicenseValidation } from './useLicenseValidation';
export type { UseLicenseValidationOptions, UseLicenseValidationResult } from './useLicenseValidation';
export { useEditorState, EditorStateStore } from './useEditorState';
