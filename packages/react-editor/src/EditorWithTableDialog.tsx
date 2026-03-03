import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { DOMSerializer } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { RichTextEditor } from './index';
import { TableInsertDialog } from './TableInsertDialog';
import { tableDialogBridge } from '@inkstream/editor-core';

/** Imperative handle exposed via ref on EditorWithTableDialog. */
export interface EditorHandle {
  /** Returns the current editor content serialized as an HTML string. */
  getContent: () => string;
  /** Focuses the editor. */
  focus: () => void;
}

export interface EditorWithTableDialogProps {
  initialContent: string;
  plugins?: any[];
  pluginOptions?: { [key: string]: any };
  toolbarLayout?: string[];
  licenseKey?: string;
  licenseValidationEndpoint?: string;
  onLicenseError?: (plugin: any, tier: string) => void;
  /** Called with the current HTML string whenever the document changes. */
  onChange?: (html: string) => void;
}

export const EditorWithTableDialog = forwardRef<EditorHandle, EditorWithTableDialogProps>(
  (props, ref) => {
    const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
    const editorViewRef = useRef<EditorView | null>(null);

    useImperativeHandle(ref, () => ({
      getContent: () => {
        const view = editorViewRef.current;
        if (!view) return '';
        const div = document.createElement('div');
        const fragment = DOMSerializer.fromSchema(view.state.schema).serializeFragment(view.state.doc.content);
        div.appendChild(fragment);
        return div.innerHTML;
      },
      focus: () => {
        editorViewRef.current?.focus();
      },
    }));

    // Register the dialog opener in the bridge; clean up on unmount
    useEffect(() => {
      tableDialogBridge.openDialog = () => setIsTableDialogOpen(true);
      return () => {
        tableDialogBridge.openDialog = null;
      };
    }, []);

    const handleEditorReady = useCallback((view: EditorView) => {
      editorViewRef.current = view;
    }, []);

    const handleInsertTable = useCallback((config: { rows: number; cols: number; withHeaderRow: boolean }) => {
      const view = editorViewRef.current;
      if (view && tableDialogBridge.insertTable) {
        const command = tableDialogBridge.insertTable(config.rows, config.cols, config.withHeaderRow);
        command(view.state, view.dispatch, view);
      }
      setIsTableDialogOpen(false);
    }, []);

    return (
      <>
        <RichTextEditor {...props} onEditorReady={handleEditorReady} />
        <TableInsertDialog
          isOpen={isTableDialogOpen}
          onClose={() => setIsTableDialogOpen(false)}
          onInsert={handleInsertTable}
        />
      </>
    );
  }
);
