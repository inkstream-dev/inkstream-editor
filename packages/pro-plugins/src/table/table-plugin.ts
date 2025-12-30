import { createPlugin } from '@inkstream/editor-core';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { columnResizing, tableEditing, fixTables } from 'prosemirror-tables';
import { keymap } from 'prosemirror-keymap';
import { getTableNodes, TABLE_STYLES } from './table-schema';
import { getTableToolbarItems, setTableDialogHandler } from './table-toolbar';
import { goToNextCellCmd, goToPreviousCellCmd, insertTable } from './table-commands';

// Initialize the global registry when this module loads
if (typeof window !== 'undefined') {
  console.log('[TABLE PLUGIN] Initializing global registry');
  if (!(window as any).__inkstreamTableDialogRegistry__) {
    (window as any).__inkstreamTableDialogRegistry__ = {};
  }
  (window as any).__inkstreamTableDialogRegistry__.setHandler = setTableDialogHandler;
  (window as any).__inkstreamTableDialogRegistry__.insertTable = insertTable;
  console.log('[TABLE PLUGIN] Global registry initialized:', (window as any).__inkstreamTableDialogRegistry__);
}

/**
 * Table Plugin - PRO FEATURE
 * Full-featured table support with:
 * - Insert/delete rows and columns
 * - Merge and split cells
 * - Column resizing with drag handles
 * - Keyboard navigation (Tab, Shift+Tab, arrows)
 * - Header row support
 * - Undo/redo support
 */
export const tablePlugin = createPlugin({
  name: 'table',
  tier: 'pro',
  description: 'Full-featured table support (Pro feature)',

  // Define table nodes for the schema
  nodes: getTableNodes(),

  // Get ProseMirror plugins for table functionality
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const plugins: ProseMirrorPlugin[] = [];

    // Core table editing plugin
    // Handles cell selection, keyboard navigation, etc.
    plugins.push(tableEditing());

    // Column resizing plugin
    // Enables drag-to-resize columns
    plugins.push(columnResizing());

    // Fix tables plugin
    // Ensures tables are valid after transactions
    plugins.push(
      new ProseMirrorPlugin({
        appendTransaction(transactions, oldState, newState) {
          return fixTables(newState);
        },
      })
    );

    // Table keyboard shortcuts
    plugins.push(
      keymap({
        Tab: goToNextCellCmd,
        'Shift-Tab': goToPreviousCellCmd,
      })
    );

    return plugins;
  },

  // Get toolbar items for table operations
  getToolbarItems: (schema: Schema) => {
    return getTableToolbarItems(schema);
  },
});

/**
 * Inject table CSS styles into the document
 * Call this once when initializing the editor
 */
export function injectTableStyles(): void {
  if (typeof document === 'undefined') {
    console.log('[TABLE STYLES] SSR detected, skipping style injection');
    return; // SSR guard
  }

  const styleId = 'inkstream-table-styles';
  
  // Check if styles already injected
  if (document.getElementById(styleId)) {
    console.log('[TABLE STYLES] Styles already injected');
    return;
  }

  console.log('[TABLE STYLES] Injecting table styles...');
  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = TABLE_STYLES;
  document.head.appendChild(styleElement);
  console.log('[TABLE STYLES] Table styles injected successfully');
}

// Export everything
export * from './table-schema';
export * from './table-commands';
export * from './table-toolbar';
