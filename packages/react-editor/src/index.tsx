"use client";

import React, { useRef, useEffect, useState } from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMParser } from 'prosemirror-model';
import { inkstreamSchema, pluginManager, boldPlugin } from '@inkstream/editor-core'; // Import boldPlugin directly
import { Toolbar } from './Toolbar';

interface RichTextEditorProps {
  initialContent: string;
  // plugins?: Plugin[]; // Removed plugins prop
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialContent }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [currentEditorState, setCurrentEditorState] = useState<EditorState | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      pluginManager.clearPlugins();

      // Register boldPlugin directly here
      pluginManager.registerPlugin(boldPlugin);

      const parser = DOMParser.fromSchema(inkstreamSchema);
      const doc = parser.parse(new window.DOMParser().parseFromString(initialContent, "text/html").body);

      const state = EditorState.create({
        schema: inkstreamSchema,
        doc: doc,
        plugins: pluginManager.getProseMirrorPlugins(inkstreamSchema),
      });

      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction(transaction) {
          const newState = view.state.apply(transaction);
          view.updateState(newState);
          setCurrentEditorState(newState);
        },
      });

      setEditorView(view);
      setCurrentEditorState(state);

      return () => {
        if (view) {
          view.destroy();
        }
      };
    }
  }, [initialContent]);

  return (
    <div className="inkstream-editor-wrapper">
      <Toolbar
        editorState={currentEditorState}
        editorDispatch={editorView ? editorView.dispatch : null}
        editorView={editorView}
      />
      <div ref={editorRef} className="inkstream-editor" />
    </div>
  );
};