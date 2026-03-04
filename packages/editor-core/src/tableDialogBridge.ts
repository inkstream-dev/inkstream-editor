import { EditorView } from 'prosemirror-view';

/**
 * Module-level bridge between the table plugin (pro-plugins package) and the
 * table-insert dialog (react-editor package).
 *
 * Replaces the previous `window.__inkstreamTableDialogRegistry__` and
 * `window.__inkstreamEditorView__` globals — works in SSR environments too.
 */
export const tableDialogBridge = {
  /** Set by EditorWithTableDialog to open the insert-table dialog. */
  openDialog: null as (() => void) | null,
  /**
   * Set by the table plugin when it initialises.
   * Returns a ProseMirror command that inserts a table.
   */
  insertTable: null as ((rows: number, cols: number, withHeaderRow: boolean) => (state: any, dispatch: any, view: EditorView) => boolean) | null,
  /** Set by EditorWithTableDialog to open the table-properties dialog. */
  openPropertiesDialog: null as (() => void) | null,
  /** Set by EditorWithTableDialog to provide access to the live EditorView. */
  getEditorView: null as (() => EditorView | null) | null,
  /**
   * Set by the table plugin (pro-plugins) so the dialog can apply cell
   * attribute changes without a direct prosemirror-tables dependency.
   * Accepts a plain object of attribute name→value pairs.
   */
  applyCellStyling: null as ((attrs: Record<string, unknown>) => void) | null,
  /** Set by the table plugin to toggle the header row. */
  runToggleHeaderRow: null as (() => void) | null,
  /** Set by the table plugin to delete the current table. */
  runDeleteTable: null as (() => void) | null,
};
