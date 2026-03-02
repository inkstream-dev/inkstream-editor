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
  setCellAlignment,
  setCellBackground,
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

  // Single unified Table button (always visible)
  items.push({
    id: 'table',
    icon: '⊞ Table',
    tooltip: 'Table',
    type: 'dropdown',
    children: [
      // Insert Table Section
      {
        id: 'insertTable',
        icon: '⊞ Insert Table',
        tooltip: 'Insert Table',
        command: (state, dispatch, view) => {
          console.log('[TABLE TOOLBAR] Insert Table button clicked');
          console.log('[TABLE TOOLBAR] showTableDialog is:', showTableDialog);
          if (showTableDialog) {
            console.log('[TABLE TOOLBAR] Calling showTableDialog()');
            showTableDialog();
            return true;
          }
          console.log('[TABLE TOOLBAR] showTableDialog is null, cannot open dialog');
          return false;
        },
        isVisible: (state: EditorState) => !isInTable(state),
      },
      // Row Actions Section
      {
        id: 'rowActions',
        icon: '━ Row Actions',
        tooltip: 'Row Actions',
        type: 'dropdown',
        isVisible: (state: EditorState) => isInTable(state),
        children: [
          {
            id: 'addRowBefore',
            icon: '↑ Add Row Above',
            tooltip: 'Add Row Above',
            command: addRowBeforeCmd,
          },
          {
            id: 'addRowAfter',
            icon: '↓ Add Row Below',
            tooltip: 'Add Row Below',
            command: addRowAfterCmd,
          },
          {
            id: 'deleteRow',
            icon: '✕ Delete Row',
            tooltip: 'Delete Row',
            command: deleteRowCmd,
          },
        ],
      },
      // Column Actions Section
      {
        id: 'columnActions',
        icon: '┃ Column Actions',
        tooltip: 'Column Actions',
        type: 'dropdown',
        isVisible: (state: EditorState) => isInTable(state),
        children: [
          {
            id: 'addColumnBefore',
            icon: '← Add Column Before',
            tooltip: 'Add Column Before',
            command: addColumnBeforeCmd,
          },
          {
            id: 'addColumnAfter',
            icon: '→ Add Column After',
            tooltip: 'Add Column After',
            command: addColumnAfterCmd,
          },
          {
            id: 'deleteColumn',
            icon: '✕ Delete Column',
            tooltip: 'Delete Column',
            command: deleteColumnCmd,
          },
        ],
      },
      // Cell Actions Section
      {
        id: 'cellActions',
        icon: '◫ Cell Actions',
        tooltip: 'Cell Actions',
        type: 'dropdown',
        isVisible: (state: EditorState) => isInTable(state),
        children: [
          {
            id: 'mergeCells',
            icon: '⊡ Merge Cells',
            tooltip: 'Merge Selected Cells',
            command: mergeCellsCmd,
          },
          {
            id: 'splitCell',
            icon: '⊞ Split Cell',
            tooltip: 'Split Merged Cell',
            command: splitCellCmd,
          },
        ],
      },
      // Cell Styling Section
      {
        id: 'cellStyling',
        icon: '🎨 Cell Styling',
        tooltip: 'Cell Styling',
        type: 'dropdown',
        isVisible: (state: EditorState) => isInTable(state),
        children: [
          // Alignment submenu
          {
            id: 'cellAlignment',
            icon: '⚏ Alignment',
            tooltip: 'Text Alignment',
            type: 'dropdown',
            children: [
              {
                id: 'alignLeft',
                icon: '⬅ Left',
                tooltip: 'Align Left',
                command: setCellAlignment('left'),
              },
              {
                id: 'alignCenter',
                icon: '↔ Center',
                tooltip: 'Align Center',
                command: setCellAlignment('center'),
              },
              {
                id: 'alignRight',
                icon: '➡ Right',
                tooltip: 'Align Right',
                command: setCellAlignment('right'),
              },
            ],
          },
          // Background color submenu
          {
            id: 'cellBackground',
            icon: '🎨 Background',
            tooltip: 'Cell Background Color',
            type: 'dropdown',
            children: [
              {
                id: 'bgNone',
                icon: '⬜ None',
                tooltip: 'Remove Background',
                command: setCellBackground(null),
              },
              {
                id: 'bgYellow',
                icon: '🟨 Yellow',
                tooltip: 'Yellow',
                command: setCellBackground('#fff3cd'),
              },
              {
                id: 'bgGreen',
                icon: '🟩 Green',
                tooltip: 'Green',
                command: setCellBackground('#d1e7dd'),
              },
              {
                id: 'bgBlue',
                icon: '🟦 Blue',
                tooltip: 'Blue',
                command: setCellBackground('#cfe2ff'),
              },
              {
                id: 'bgRed',
                icon: '🟥 Red',
                tooltip: 'Red',
                command: setCellBackground('#f8d7da'),
              },
              {
                id: 'bgPurple',
                icon: '🟪 Purple',
                tooltip: 'Purple',
                command: setCellBackground('#e2d9f3'),
              },
              {
                id: 'bgOrange',
                icon: '🟧 Orange',
                tooltip: 'Orange',
                command: setCellBackground('#ffe5d0'),
              },
              {
                id: 'bgGray',
                icon: '⬛ Gray',
                tooltip: 'Gray',
                command: setCellBackground('#e9ecef'),
              },
            ],
          },
        ],
      },
      // Table Options Section
      {
        id: 'tableOptions',
        icon: '⚙ Table Options',
        tooltip: 'Table Options',
        type: 'dropdown',
        isVisible: (state: EditorState) => isInTable(state),
        children: [
          {
            id: 'toggleHeaderRow',
            icon: '⌃ Toggle Header Row',
            tooltip: 'Toggle Header Row',
            command: toggleHeaderRowCmd,
          },
          {
            id: 'deleteTable',
            icon: '✕ Delete Table',
            tooltip: 'Delete Entire Table',
            command: deleteTableCmd,
          },
        ],
      },
    ],
  });

  return items;
}
