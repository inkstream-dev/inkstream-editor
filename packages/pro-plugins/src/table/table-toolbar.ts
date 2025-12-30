import { Schema } from 'prosemirror-model';
import { EditorState, Transaction } from 'prosemirror-state';
import { ToolbarItem } from '@inkstream/editor-core';
import {
  addColumnBeforeCmd,
  addColumnAfterCmd,
  deleteColumnCmd,
  addRowBeforeCmd,
  addRowAfterCmd,
  deleteRowCmd,
  mergeCellsCmd,
  splitCellCmd,
  toggleHeaderRowCmd,
  deleteTableCmd,
  isInTable,
  insertTable,
} from './table-commands';

// This will be set by the react-editor when the dialog is available
let showTableDialog: (() => void) | null = null;

export function setTableDialogHandler(handler: (() => void) | null) {
  console.log('[TABLE TOOLBAR] setTableDialogHandler called with:', handler ? 'function' : 'null');
  showTableDialog = handler;
  console.log('[TABLE TOOLBAR] showTableDialog is now:', showTableDialog ? 'set' : 'null');
  
  // Also populate the global registry for EditorWithTableDialog
  if (typeof window !== 'undefined') {
    if (!(window as any).__inkstreamTableDialogRegistry__) {
      (window as any).__inkstreamTableDialogRegistry__ = {};
    }
    (window as any).__inkstreamTableDialogRegistry__.setHandler = setTableDialogHandler;
    (window as any).__inkstreamTableDialogRegistry__.insertTable = insertTable;
    console.log('[TABLE TOOLBAR] Global registry updated');
  }
}

export function getTableToolbarItems(schema: Schema): ToolbarItem[] {
  const items: ToolbarItem[] = [];

  // Insert Table button (visible when NOT in a table)
  items.push({
    id: 'insertTable',
    icon: '⊞',
    tooltip: 'Insert Table',
    command: (state, dispatch, view) => {
      console.log('[TABLE TOOLBAR] Insert Table button clicked');
      console.log('[TABLE TOOLBAR] showTableDialog is:', showTableDialog);
      // Trigger the dialog if available
      if (showTableDialog) {
        console.log('[TABLE TOOLBAR] Calling showTableDialog()');
        showTableDialog();
        return true;
      }
      console.log('[TABLE TOOLBAR] showTableDialog is null, cannot open dialog');
      return false;
    },
    isVisible: (state: EditorState) => !isInTable(state),
  });

  // Table Actions dropdown (visible only when inside a table)
  items.push({
    id: 'tableActions',
    icon: '≡',
    tooltip: 'Table Actions',
    type: 'dropdown',
    isVisible: (state: EditorState) => isInTable(state),
    children: [
      {
        id: 'addRowBefore',
        icon: '↑ Row',
        tooltip: 'Add Row Above',
        command: addRowBeforeCmd,
      },
      {
        id: 'addRowAfter',
        icon: '↓ Row',
        tooltip: 'Add Row Below',
        command: addRowAfterCmd,
      },
      {
        id: 'deleteRow',
        icon: '✕ Row',
        tooltip: 'Delete Row',
        command: deleteRowCmd,
      },
      {
        id: 'addColumnBefore',
        icon: '← Col',
        tooltip: 'Add Column Before',
        command: addColumnBeforeCmd,
      },
      {
        id: 'addColumnAfter',
        icon: '→ Col',
        tooltip: 'Add Column After',
        command: addColumnAfterCmd,
      },
      {
        id: 'deleteColumn',
        icon: '✕ Col',
        tooltip: 'Delete Column',
        command: deleteColumnCmd,
      },
      {
        id: 'mergeCells',
        icon: '⊡',
        tooltip: 'Merge Cells',
        command: mergeCellsCmd,
      },
      {
        id: 'splitCell',
        icon: '⊞',
        tooltip: 'Split Cell',
        command: splitCellCmd,
      },
      {
        id: 'toggleHeaderRow',
        icon: '⌃ Header',
        tooltip: 'Toggle Header Row',
        command: toggleHeaderRowCmd,
      },
      {
        id: 'deleteTable',
        icon: '✕ Table',
        tooltip: 'Delete Table',
        command: deleteTableCmd,
      },
    ],
  });

  return items;
}
