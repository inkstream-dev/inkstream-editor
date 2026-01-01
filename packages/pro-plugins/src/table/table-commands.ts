import { EditorState, Transaction, Command } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import {
  addColumnAfter,
  addColumnBefore,
  deleteColumn,
  addRowAfter,
  addRowBefore,
  deleteRow,
  mergeCells,
  splitCell,
  toggleHeaderRow,
  toggleHeaderColumn,
  toggleHeaderCell,
  setCellAttr,
  goToNextCell,
  deleteTable,
} from 'prosemirror-tables';

/**
 * Table Commands
 * Wrapper functions for prosemirror-tables commands
 */

/**
 * Insert a new table with specified dimensions
 */
export function insertTable(rows: number, cols: number, withHeaderRow: boolean = false): Command {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const { schema } = state;
    const { table, table_row, table_cell, table_header } = schema.nodes;

    if (!table || !table_row || !table_cell) {
      return false;
    }

    // Create table cells for each row
    const tableRows = [];
    for (let row = 0; row < rows; row++) {
      const cells = [];
      const isHeaderRow = withHeaderRow && row === 0;
      const cellType = isHeaderRow && table_header ? table_header : table_cell;
      
      for (let col = 0; col < cols; col++) {
        const cell = cellType.createAndFill();
        if (cell) cells.push(cell);
      }
      if (cells.length > 0) {
        tableRows.push(table_row.create(null, cells));
      }
    }

    // Create the table node
    const tableNode = table.create(null, tableRows);

    if (dispatch) {
      const tr = state.tr.replaceSelectionWith(tableNode);
      dispatch(tr.scrollIntoView());
    }

    return true;
  };
}

/**
 * Check if cursor is inside a table
 */
export function isInTable(state: EditorState): boolean {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.spec.tableRole === 'row') {
      return true;
    }
  }
  return false;
}

/**
 * Add a column before the current column
 */
export const addColumnBeforeCmd = addColumnBefore;

/**
 * Add a column after the current column
 */
export const addColumnAfterCmd = addColumnAfter;

/**
 * Delete the current column
 */
export const deleteColumnCmd = deleteColumn;

/**
 * Add a row before the current row
 */
export const addRowBeforeCmd = addRowBefore;

/**
 * Add a row after the current row
 */
export const addRowAfterCmd = addRowAfter;

/**
 * Delete the current row
 */
export const deleteRowCmd = deleteRow;

/**
 * Merge selected cells
 */
export const mergeCellsCmd = mergeCells;

/**
 * Split a merged cell
 */
export const splitCellCmd = splitCell;

/**
 * Toggle header row
 */
export const toggleHeaderRowCmd = toggleHeaderRow;

/**
 * Toggle header column
 */
export const toggleHeaderColumnCmd = toggleHeaderColumn;

/**
 * Toggle header cell
 */
export const toggleHeaderCellCmd = toggleHeaderCell;

/**
 * Delete the entire table
 */
export const deleteTableCmd = deleteTable;

/**
 * Set cell alignment
 */
export function setCellAlignment(alignment: 'left' | 'center' | 'right'): Command {
  return setCellAttr('alignment', alignment);
}

/**
 * Set cell background color
 */
export function setCellBackground(color: string | null): Command {
  return setCellAttr('background', color);
}

/**
 * Navigate to next cell (Tab key behavior)
 */
export const goToNextCellCmd = goToNextCell(1);

/**
 * Navigate to previous cell (Shift+Tab key behavior)
 */
export const goToPreviousCellCmd = goToNextCell(-1);

