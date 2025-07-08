"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMParser } from 'prosemirror-model';
import { inkstreamSchema, pluginManager, Plugin, pluginLoader, inkstreamPlugins, ToolbarItem } from '@inkstream/editor-core';
import { Toolbar } from './Toolbar';
import './editor.css';
import { ImageNodeView } from './ImageNodeView';
import { createRoot } from 'react-dom/client';

interface RichTextEditorProps {
  initialContent: string;
  plugins?: string[]; // Now accepts an array of plugin names (strings)
  toolbarLayout?: string[]; // Optional: Array of toolbar item IDs in desired order
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialContent, plugins, toolbarLayout }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null); // Use ref for EditorView instance
  const [currentEditorState, setCurrentEditorState] = useState<EditorState | null>(null); // State for React to react to
  const [toolbarItems, setToolbarItems] = useState<ToolbarItem[]>([]); // State for toolbar items

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
    if (!editorRef.current) return;

    // Destroy existing view if it exists before creating a new one
    if (editorViewRef.current) {
      console.log("Destroying existing EditorView for re-initialization...");
      editorViewRef.current.destroy();
      editorViewRef.current = null;
      setCurrentEditorState(null);
    }

    console.log("Initializing EditorView...");
    // Use the globally exported pluginManager instance

    const schema = inkstreamSchema(pluginManager);
    const parser = DOMParser.fromSchema(schema);
    const doc = parser.parse(new window.DOMParser().parseFromString(initialContent, "text/html").body);
    console.log("Parsed initial content doc:", doc.toJSON());

    const state = EditorState.create({
      schema: schema,
      doc: doc,
      plugins: inkstreamPlugins(pluginManager),
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

    // Get all available toolbar items
    const allToolbarItems = pluginManager.getToolbarItems(schema);
    let orderedToolbarItems: ToolbarItem[] = [];

    if (toolbarLayout && toolbarLayout.length > 0) {
      // If a layout is provided, use it to order the items
      for (const itemId of toolbarLayout) {
        const item = allToolbarItems.get(itemId);
        if (item) {
          orderedToolbarItems.push(item);
        }
      }
    } else {
      // Otherwise, use the default order (values from the map)
      orderedToolbarItems = Array.from(allToolbarItems.values());
    }

    console.log("Toolbar items collected:", orderedToolbarItems);
    setToolbarItems(orderedToolbarItems);

    // Cleanup function for EditorView when component unmounts
    return () => {
      if (editorViewRef.current) {
        console.log("Destroying EditorView on unmount...");
        editorViewRef.current.destroy();
        editorViewRef.current = null;
        setCurrentEditorState(null);
      }
    };
  }, [initialContent, handleDispatchTransaction, toolbarLayout]); // Add toolbarLayout to dependency array

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