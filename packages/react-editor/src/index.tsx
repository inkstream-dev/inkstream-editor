"use client";

import React, { useRef, useEffect } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMParser } from 'prosemirror-model';
import { inkstreamSchema, pluginManager } from '@inkstream/editor-core';
import { Toolbar } from './Toolbar';

interface RichTextEditorProps {
  initialContent: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialContent }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (editorRef.current && !viewRef.current) {
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
        },
      });

      viewRef.current = view;

      return () => {
        if (viewRef.current) {
          viewRef.current.destroy();
          viewRef.current = null;
        }
      };
    }
  }, [initialContent]);

  return (
    <>
      {viewRef.current && <Toolbar view={viewRef.current} />}
      <div ref={editorRef} className="inkstream-editor" />
    </>
  );
};
