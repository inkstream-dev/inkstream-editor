"use client";

import React, { useState, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorView } from '@inkstream/pm/view';
import type { EditorState, Transaction } from '@inkstream/pm/state';
import { RichTextEditor, EditorRef } from './index';
import { TableInsertDialog } from './TableInsertDialog';
import { TablePropertiesDialog } from './TablePropertiesDialog';

/** Imperative handle exposed via ref on EditorWithTableDialog. */
export interface EditorHandle {
  /** Returns the current editor content serialized as an HTML string. */
  getContent: () => string;
  /** Focuses the editor. */
  focus: () => void;
}

/**
 * Commands registered by the table plugin when it initialises.
 * The table plugin should call `this.options.onCommandsReady(commands)` in its
 * `onCreate` lifecycle hook; `EditorWithTableDialog` then forwards them to the
 * table dialogs so they can dispatch operations without needing a global bridge.
 */
export interface TableCommands {
  insertTable: (
    rows: number,
    cols: number,
    withHeaderRow: boolean,
  ) => (state: EditorState, dispatch: (tr: Transaction) => void, view: EditorView) => boolean;
  applyCellStyling: (attrs: Record<string, unknown>) => void;
  runToggleHeaderRow: () => void;
  runDeleteTable: () => void;
}

/**
 * Options injected into `pluginOptions.table` by `EditorWithTableDialog`.
 * The table plugin should declare these in its `addOptions()` so that
 * `this.options.openInsertDialog()` etc. work inside toolbar commands.
 */
export interface TablePluginOptions {
  /** Call to open the table-insert dialog. Set by EditorWithTableDialog. */
  openInsertDialog?: () => void;
  /** Call to open the table-properties dialog. Set by EditorWithTableDialog. */
  openPropertiesDialog?: () => void;
  /**
   * The table plugin calls this in `onCreate`, providing its command
   * implementations. EditorWithTableDialog stores them and forwards them to the
   * dialog components as props — no global state involved.
   */
  onCommandsReady?: (commands: TableCommands) => void;
}

export interface EditorWithTableDialogProps {
  initialContent: string;
  plugins?: any[];
  pluginOptions?: { [key: string]: Record<string, unknown> };
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
  /**
   * When `false`, defers the editor's first render to the client-side effect,
   * preventing SSR / Next.js App Router hydration mismatches.
   * Forwarded directly to `RichTextEditor`. Defaults to `true`.
   */
  immediatelyRender?: boolean;
}

export const EditorWithTableDialog = forwardRef<EditorHandle, EditorWithTableDialogProps>(
  ({ pluginOptions, ...restProps }, ref) => {
    const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
    const [isPropertiesDialogOpen, setIsPropertiesDialogOpen] = useState(false);
    // Ref to the inner RichTextEditor — used to call getContent(), getView(), focus().
    const richEditorRef = useRef<EditorRef>(null);
    // Populated by the table plugin via onCommandsReady; forwarded to dialogs as props.
    const tableCommandsRef = useRef<TableCommands | null>(null);

    useImperativeHandle(ref, () => ({
      getContent: () => richEditorRef.current?.getContent() ?? '',
      focus: () => richEditorRef.current?.getView()?.focus(),
    }));

    // Merge caller-provided pluginOptions with the hook callbacks the table
    // plugin needs. The table plugin reads these from this.options so it can
    // open dialogs and register its commands without any global state.
    const mergedPluginOptions = useMemo<{ [key: string]: Record<string, unknown> }>(() => ({
      ...pluginOptions,
      table: {
        ...(pluginOptions?.table ?? {}),
        openInsertDialog: () => setIsTableDialogOpen(true),
        openPropertiesDialog: () => setIsPropertiesDialogOpen(true),
        onCommandsReady: (cmds: TableCommands) => {
          tableCommandsRef.current = cmds;
        },
      } as unknown as Record<string, unknown>,
    }), [pluginOptions]);

    const handleInsertTable = useCallback((config: { rows: number; cols: number; withHeaderRow: boolean }) => {
      const view = richEditorRef.current?.getView();
      const cmds = tableCommandsRef.current;
      if (view && cmds?.insertTable) {
        const command = cmds.insertTable(config.rows, config.cols, config.withHeaderRow);
        command(view.state, view.dispatch, view);
      }
      setIsTableDialogOpen(false);
    }, []);

    return (
      <>
        <RichTextEditor
          ref={richEditorRef}
          {...restProps}
          pluginOptions={mergedPluginOptions}
        />
        <TableInsertDialog
          isOpen={isTableDialogOpen}
          onClose={() => setIsTableDialogOpen(false)}
          onInsert={handleInsertTable}
        />
        <TablePropertiesDialog
          isOpen={isPropertiesDialogOpen}
          onClose={() => setIsPropertiesDialogOpen(false)}
          getEditorView={() => richEditorRef.current?.getView() ?? null}
          applyCellStyling={(attrs) => tableCommandsRef.current?.applyCellStyling(attrs)}
          runToggleHeaderRow={() => tableCommandsRef.current?.runToggleHeaderRow()}
          runDeleteTable={() => tableCommandsRef.current?.runDeleteTable()}
        />
      </>
    );
  },
);

EditorWithTableDialog.displayName = 'EditorWithTableDialog';
