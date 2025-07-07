"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMParser } from 'prosemirror-model';
import { inkstreamSchema, pluginManager, Plugin, inkstreamPlugins } from '@inkstream/editor-core';
import { Toolbar } from './Toolbar';
import './editor.css';

interface RichTextEditorProps {
  initialContent: string;
  plugins?: string[]; // Now accepts an array of plugin names (strings)
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialContent, plugins }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null); // Use ref for EditorView instance
  const [currentEditorState, setCurrentEditorState] = useState<EditorState | null>(null); // State for React to react to
  const [toolbarItems, setToolbarItems] = useState<any[]>([]); // State for toolbar items

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
    });

    editorViewRef.current = view;
    setCurrentEditorState(state);
    const items = pluginManager.getToolbarItems(schema);
    console.log("Toolbar items collected:", items);
    setToolbarItems(items);

    // Cleanup function for EditorView when component unmounts
    return () => {
      if (editorViewRef.current) {
        console.log("Destroying EditorView on unmount...");
        editorViewRef.current.destroy();
        editorViewRef.current = null;
        setCurrentEditorState(null);
      }
    };
  }, [initialContent, handleDispatchTransaction]); // Removed 'plugins' from dependency array as they are now loaded synchronously

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