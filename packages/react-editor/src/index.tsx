"use client";

import React, { useRef, useEffect } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { inkstreamSchema } from '@inkstream/editor-core';

interface RichTextEditorProps {
  initialContent: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialContent }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      const state = EditorState.create({
        schema: inkstreamSchema,
      });

      const view = new EditorView(editorRef.current, {
        state,
        // You can add dispatchTransaction and other props here later
      });

      return () => {
        view.destroy();
      };
    }
  }, []);

  return <div ref={editorRef} className="inkstream-editor" />;
};