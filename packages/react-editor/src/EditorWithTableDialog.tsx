"use client";

import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { DOMSerializer } from '@inkstream/pm/model';
import { EditorView } from '@inkstream/pm/view';
import { RichTextEditor } from './index';
import { TableInsertDialog } from './TableInsertDialog';
import { TablePropertiesDialog } from './TablePropertiesDialog';
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
  /** Controls the colour scheme: 'auto' follows OS, 'light' forces light, 'dark' forces dark. */
  theme?: import('./index').ThemeMode;
  /** When true, adds a theme-toggle button to the right end of the toolbar. */
  showThemeToggle?: boolean;
  /** Called whenever the theme changes. */
  onThemeChange?: (theme: import('./index').ThemeMode) => void;
}

export const EditorWithTableDialog = forwardRef<EditorHandle, EditorWithTableDialogProps>(
  (props, ref) => {
    const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
    const [isPropertiesDialogOpen, setIsPropertiesDialogOpen] = useState(false);
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

    // Register bridges; clean up on unmount
    useEffect(() => {
      tableDialogBridge.openDialog = () => setIsTableDialogOpen(true);
      tableDialogBridge.openPropertiesDialog = () => setIsPropertiesDialogOpen(true);
      tableDialogBridge.getEditorView = () => editorViewRef.current;
      return () => {
        tableDialogBridge.openDialog = null;
        tableDialogBridge.openPropertiesDialog = null;
        tableDialogBridge.getEditorView = null;
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
        <TablePropertiesDialog
          isOpen={isPropertiesDialogOpen}
          onClose={() => setIsPropertiesDialogOpen(false)}
        />
      </>
    );
  }
);
