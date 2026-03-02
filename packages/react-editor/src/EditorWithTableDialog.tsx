import React, { useState, useCallback, useEffect, useRef } from 'react';
import { EditorView } from 'prosemirror-view';
import { RichTextEditor } from './index';
import { TableInsertDialog } from './TableInsertDialog';
import { tableDialogBridge } from '@inkstream/editor-core';

export interface EditorWithTableDialogProps {
  initialContent: string;
  plugins?: any[];
  pluginOptions?: { [key: string]: any };
  toolbarLayout?: string[];
  licenseKey?: string;
  licenseValidationEndpoint?: string;
  onLicenseError?: (plugin: any, tier: string) => void;
}

export const EditorWithTableDialog: React.FC<EditorWithTableDialogProps> = (props) => {
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const editorViewRef = useRef<EditorView | null>(null);

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
};
