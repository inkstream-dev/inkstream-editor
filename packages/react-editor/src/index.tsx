"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMParser, Schema } from 'prosemirror-model';
import { inkstreamSchema, PluginManager, Plugin, availablePlugins, inkstreamPlugins, ToolbarItem, LicenseManager } from '@inkstream/editor-core';
import { inputRules, wrappingInputRule, textblockTypeInputRule, smartQuotes, emDash, ellipsis, InputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, splitBlock, chainCommands } from 'prosemirror-commands';
import { splitListItem, liftListItem } from 'prosemirror-schema-list';
import { getLinkBubbleToolbarItem } from '@inkstream/link-bubble';
import { Toolbar } from './Toolbar';
import './editor.css';
import { ImageNodeView } from './ImageNodeView';
import { createRoot } from 'react-dom/client';

// Build input rules for the schema
const buildInputRules = (schema: Schema) => {
  const rules = smartQuotes.concat(ellipsis, emDash);

  // Rule for headings (e.g., # Heading)
  if (schema.nodes.heading) {
    rules.push(textblockTypeInputRule(/^#+\s$/, schema.nodes.heading, (match) => ({ level: match[0].length - 1 })));
  }

  // Rule for blockquotes (e.g., > Quote)
  if (schema.nodes.blockquote) {
    rules.push(wrappingInputRule(/^>\s$/, schema.nodes.blockquote));
  }

  // Rule for code blocks (e.g., ``` Code)
  if (schema.nodes.code_block) {
    rules.push(textblockTypeInputRule(/^```\s$/, schema.nodes.code_block));
  }

  // Rules for bold
  if (schema.marks.strong) {
    rules.push(new InputRule(/\*\*([^*]+)\*\*$/, (state, match, start, end) => {
      const tr = state.tr;
      if (match[1]) {
        const textStart = start + match[0].indexOf(match[1]);
        const textEnd = textStart + match[1].length;
        tr.delete(textStart, textEnd);
        tr.addMark(textStart, textEnd, schema.marks.strong.create());
      }
      return tr;
    }));

    rules.push(new InputRule(/__([^_]+)__$/, (state, match, start, end) => {
      const tr = state.tr;
      if (match[1]) {
        const textStart = start + match[0].indexOf(match[1]);
        const textEnd = textStart + match[1].length;
        tr.delete(textStart, textEnd);
        tr.addMark(textStart, textEnd, schema.marks.strong.create());
      }
      return tr;
    }));
  }

  return inputRules({ rules });
};

// Build keymap for the schema
const buildKeymap = (schema: Schema, manager: PluginManager) => {
  const keys: { [key: string]: any } = {};

  // Add base keymap commands
  Object.assign(keys, baseKeymap);

  // Add keymaps from plugins
  manager.getPlugins().forEach(plugin => {
    const pluginKeymap = plugin.getKeymap?.(schema);
    if (pluginKeymap) {
      Object.assign(keys, pluginKeymap);
    }
  });

  // Add keybinding for hard breaks (Shift-Enter)
  if (schema.nodes.hard_break) {
    keys["Shift-Enter"] = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
      if (dispatch) {
        dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView());
      }
      return true;
    };
  }

  // Add keybinding for creating a new paragraph (Enter)
  if (schema.nodes.list_item) {
    keys["Enter"] = chainCommands(splitListItem(schema.nodes.list_item), liftListItem(schema.nodes.list_item), splitBlock);
  }

  return keymap(keys);
};

interface RichTextEditorProps {
  initialContent: string;
  plugins?: Plugin[];  // Now accepts Plugin instances instead of string IDs
  pluginOptions?: { [key: string]: any };
  toolbarLayout?: string[];
  licenseKey?: string; // Optional license key for pro/premium features
  onLicenseError?: (plugin: Plugin, tier: string) => void; // Callback when a plugin requires a higher tier
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  initialContent, 
  plugins = Object.values(availablePlugins),  // Default to all available plugins
  pluginOptions = {}, 
  toolbarLayout = [],
  licenseKey,
  onLicenseError,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null); // Use ref for EditorView instance
  const [currentEditorState, setCurrentEditorState] = useState<EditorState | null>(null); // State for React to react to
  type ToolbarItemOrSeparator = ToolbarItem | string;

  const [toolbarItems, setToolbarItems] = useState<ToolbarItemOrSeparator[]>([]); // State for toolbar items
  const [licenseManager] = useState(() => new LicenseManager(licenseKey)); // Create license manager
  const isInitializedRef = useRef(false); // Prevent double initialization in StrictMode
  
  // Use useState with lazy initialization to ensure plugins are created only once
  const [pluginState] = useState(() => {
    console.log('=== CREATING PLUGIN STATE (should only happen once) ===');
    // Filter plugins based on license tier
    const validated = plugins.filter(plugin => {
      const pluginTier = plugin.tier || 'free';
      const canUse = licenseManager.canUsePlugin(pluginTier);
      
      if (!canUse) {
        console.warn(`Plugin "${plugin.name}" requires ${pluginTier} tier but user has ${licenseManager.getTier()} tier`);
        if (onLicenseError) {
          onLicenseError(plugin, pluginTier);
        }
        return false;
      }
      
      return true;
    });

    // Create plugin manager and register all plugins
    const manager = new PluginManager();
    console.log('Registering plugins:', validated.map(p => p.name));
    validated.forEach(plugin => manager.registerPlugin(plugin));
    console.log('Manager has plugins:', manager.getPlugins().map(p => p.name));
    
    // Create schema from the manager
    const editorSchema = inkstreamSchema(manager);
    
    // Build ProseMirror plugins - do NOT call inkstreamPlugins() which creates a duplicate manager!
    // Instead, build plugins directly from this manager instance
    const pmPlugins = [
      ...manager.getProseMirrorPlugins(editorSchema),
      buildInputRules(editorSchema),
      buildKeymap(editorSchema, manager),
    ];

    console.log('=== PLUGIN STATE CREATED ===');
    console.log('Total plugins:', pmPlugins.length);
    console.log('Plugin details:', pmPlugins.map((p: any) => {
      if (p.spec && p.spec.key) {
        return `Plugin with key: ${p.spec.key}`;
      }
      return p.constructor.name || 'Unknown plugin';
    }));
    
    // Check for duplicate keyed plugins
    const keyedPlugins = pmPlugins.filter((p: any) => p.spec && p.spec.key);
    const keys = keyedPlugins.map((p: any) => p.spec.key);
    const uniqueKeys = new Set(keys);
    console.log('Keyed plugins:', keys);
    console.log('Unique keys:', Array.from(uniqueKeys));
    if (keys.length !== uniqueKeys.size) {
      console.error('DUPLICATE KEYS DETECTED!', keys);
    }

    return {
      validatedPlugins: validated,
      pluginManager: manager,
      schema: editorSchema,
      proseMirrorPlugins: pmPlugins,
    };
  });

  const { validatedPlugins, pluginManager, schema, proseMirrorPlugins } = pluginState;

  // This function will be passed to EditorView and will be responsible for updating ProseMirror's state
  // and then reflecting that change in React's state.
  const handleDispatchTransaction = useCallback((transaction: Transaction) => {
    if (editorViewRef.current) {
      const newState = editorViewRef.current.state.apply(transaction);
      editorViewRef.current.updateState(newState);
      setCurrentEditorState(newState);
    }
  }, []); // This callback is stable and won't change

  useEffect(() => {
    if (!editorRef.current || isInitializedRef.current) {
      console.log('useEffect: Skipping initialization (already initialized or no ref)');
      return;
    }

    // Mark as initialized immediately to prevent double initialization
    isInitializedRef.current = true;

    console.log("=== INITIALIZING EDITORVIEW ===");
    console.log(`Loaded ${validatedPlugins.length} out of ${plugins.length} plugins (license tier: ${licenseManager.getTier()})`);
    console.log('Using proseMirrorPlugins:', proseMirrorPlugins);
    
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

    console.log('About to call EditorState.create with', proseMirrorPlugins.length, 'plugins');
    const state = EditorState.create({
      schema: schema,
      doc: doc,
      plugins: proseMirrorPlugins,
    });
    console.log('=== EDITORSTATE CREATED SUCCESSFULLY ===');

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
    console.log("Ordered Toolbar Items:", orderedToolbarItems);
    setToolbarItems(orderedToolbarItems);

    // Cleanup function for EditorView when component unmounts
    return () => {
      if (editorViewRef.current) {
        console.log("Destroying EditorView on unmount...");
        editorViewRef.current.destroy();
        editorViewRef.current = null;
        setCurrentEditorState(null);
      }
      // Reset initialization flag on unmount
      isInitializedRef.current = false;
    };
  }, []); // Empty dependency array - only run on mount/unmount

  return (
    <div className="inkstream-editor-wrapper">
      <Toolbar
        editorState={currentEditorState}
        editorDispatch={editorViewRef.current ? editorViewRef.current.dispatch : null}
        editorView={editorViewRef.current}
        toolbarItems={toolbarItems}
      />
      <div ref={editorRef} className="inkstream-editor" />
    </div>
  );
};