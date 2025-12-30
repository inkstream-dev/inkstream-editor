import { Schema, NodeSpec, DOMOutputSpec } from 'prosemirror-model';
import { tableNodes } from 'prosemirror-tables';

/**
 * Table Schema Definitions
 * Extends ProseMirror schema with table nodes
 */

export interface TableNodesSpec {
  table: NodeSpec;
  table_row: NodeSpec;
  table_cell: NodeSpec;
  table_header: NodeSpec;
}

/**
 * CSS classes for table styling
 */
export const TABLE_CSS_CLASSES = {
  table: 'inkstream-table',
  tableWrapper: 'inkstream-table-wrapper',
  cell: 'inkstream-table-cell',
  headerCell: 'inkstream-table-header-cell',
  selectedCell: 'selectedCell',
  columnResize: 'column-resize-handle',
};

/**
 * Get table nodes with custom configuration
 * This creates the schema definitions for table, table_row, table_cell, and table_header
 */
export function getTableNodes(): TableNodesSpec {
  const nodes = tableNodes({
    tableGroup: 'block',
    cellContent: 'block+',
    cellAttributes: {
      background: {
        default: null,
        getFromDOM(dom: HTMLElement) {
          return dom.style.backgroundColor || null;
        },
        setDOMAttr(value: unknown, attrs: any) {
          if (value && typeof value === 'string') {
            attrs.style = `${attrs.style || ''}background-color: ${value};`;
          }
        },
      },
      class: {
        default: null,
        getFromDOM(dom: HTMLElement) {
          return dom.getAttribute('class') || null;
        },
        setDOMAttr(value: unknown, attrs: any) {
          if (value && typeof value === 'string') {
            attrs.class = value;
          }
        },
      },
      colspan: {
        default: 1,
        getFromDOM(dom: HTMLElement) {
          const colspan = dom.getAttribute('colspan');
          return colspan ? parseInt(colspan, 10) : 1;
        },
        setDOMAttr(value: unknown, attrs: any) {
          if (typeof value === 'number' && value !== 1) {
            attrs.colspan = value;
          }
        },
      },
      rowspan: {
        default: 1,
        getFromDOM(dom: HTMLElement) {
          const rowspan = dom.getAttribute('rowspan');
          return rowspan ? parseInt(rowspan, 10) : 1;
        },
        setDOMAttr(value: unknown, attrs: any) {
          if (typeof value === 'number' && value !== 1) {
            attrs.rowspan = value;
          }
        },
      },
      colwidth: {
        default: null,
        getFromDOM(dom: HTMLElement) {
          const colwidth = dom.getAttribute('data-colwidth');
          return colwidth ? colwidth.split(',').map((w: string) => parseInt(w, 10)) : null;
        },
        setDOMAttr(value: unknown, attrs: any) {
          if (value && Array.isArray(value)) {
            attrs['data-colwidth'] = value.join(',');
          }
        },
      },
      alignment: {
        default: 'left',
        getFromDOM(dom: HTMLElement) {
          return dom.style.textAlign || 'left';
        },
        setDOMAttr(value: unknown, attrs: any) {
          if (value && typeof value === 'string' && value !== 'left') {
            attrs.style = (attrs.style || '') + `text-align: ${value};`;
          }
        },
      },
    },
  });

  // Override toDOM for table node to add CSS class
  if (nodes.table) {
    nodes.table.toDOM = (node) => {
      // Get existing attributes from prosemirror-tables
      const attrs: any = {};
      
      // Add our CSS class
      attrs.class = TABLE_CSS_CLASSES.table;
      
      return ['table', attrs, ['tbody', 0]];
    };
  }

  // Override toDOM for table_cell to add CSS class
  if (nodes.table_cell) {
    const originalCellToDOM = nodes.table_cell.toDOM;
    nodes.table_cell.toDOM = (node) => {
      const attrs: any = { class: TABLE_CSS_CLASSES.cell };
      
      // Apply cell attributes
      if (node.attrs.colspan && node.attrs.colspan !== 1) {
        attrs.colspan = node.attrs.colspan;
      }
      if (node.attrs.rowspan && node.attrs.rowspan !== 1) {
        attrs.rowspan = node.attrs.rowspan;
      }
      if (node.attrs.colwidth) {
        attrs['data-colwidth'] = node.attrs.colwidth.join(',');
      }
      
      // Apply styles
      const styles: string[] = [];
      if (node.attrs.background) {
        styles.push(`background-color: ${node.attrs.background}`);
      }
      if (node.attrs.alignment && node.attrs.alignment !== 'left') {
        styles.push(`text-align: ${node.attrs.alignment}`);
      }
      if (styles.length > 0) {
        attrs.style = styles.join('; ');
      }
      
      return ['td', attrs, 0];
    };
  }

  // Override toDOM for table_header to add CSS class
  if (nodes.table_header) {
    const originalHeaderToDOM = nodes.table_header.toDOM;
    nodes.table_header.toDOM = (node) => {
      const attrs: any = { class: TABLE_CSS_CLASSES.headerCell };
      
      // Apply cell attributes
      if (node.attrs.colspan && node.attrs.colspan !== 1) {
        attrs.colspan = node.attrs.colspan;
      }
      if (node.attrs.rowspan && node.attrs.rowspan !== 1) {
        attrs.rowspan = node.attrs.rowspan;
      }
      if (node.attrs.colwidth) {
        attrs['data-colwidth'] = node.attrs.colwidth.join(',');
      }
      
      // Apply styles
      const styles: string[] = [];
      if (node.attrs.background) {
        styles.push(`background-color: ${node.attrs.background}`);
      }
      if (node.attrs.alignment && node.attrs.alignment !== 'left') {
        styles.push(`text-align: ${node.attrs.alignment}`);
      }
      if (styles.length > 0) {
        attrs.style = styles.join('; ');
      }
      
      return ['th', attrs, 0];
    };
  }

  return nodes as TableNodesSpec;
}

/**
 * Table styling for the editor
 */
export const TABLE_STYLES = `
.${TABLE_CSS_CLASSES.tableWrapper} {
  overflow-x: auto;
  margin: 1em 0;
}

/* Also target tables without the class for prosemirror-tables compatibility */
.ProseMirror .tableWrapper {
  overflow-x: auto;
  margin: 1em 0;
}

.${TABLE_CSS_CLASSES.table} {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  overflow: hidden;
  border: 2px solid #ddd;
}

/* Also target tables inside tableWrapper for prosemirror-tables compatibility */
.ProseMirror .tableWrapper > table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  overflow: hidden;
  border: 2px solid #ddd;
}

.${TABLE_CSS_CLASSES.table} td,
.${TABLE_CSS_CLASSES.table} th {
  min-width: 1em;
  border: 1px solid #ddd;
  padding: 8px 12px;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

/* Also target cells without the class */
.ProseMirror .tableWrapper > table td,
.ProseMirror .tableWrapper > table th {
  min-width: 1em;
  border: 1px solid #ddd;
  padding: 8px 12px;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

.${TABLE_CSS_CLASSES.table} th {
  font-weight: bold;
  text-align: left;
  background-color: #f5f5f5;
}

.ProseMirror .tableWrapper > table th {
  font-weight: bold;
  text-align: left;
  background-color: #f5f5f5;
}

.${TABLE_CSS_CLASSES.table} .${TABLE_CSS_CLASSES.selectedCell}:after {
  z-index: 2;
  position: absolute;
  content: "";
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(200, 200, 255, 0.4);
  pointer-events: none;
}

.ProseMirror .tableWrapper > table .selectedCell:after {
  z-index: 2;
  position: absolute;
  content: "";
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(200, 200, 255, 0.4);
  pointer-events: none;
}

.${TABLE_CSS_CLASSES.columnResize} {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  z-index: 20;
  background-color: #adf;
  cursor: col-resize;
}

.${TABLE_CSS_CLASSES.table} .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  z-index: 20;
  background-color: #adf;
  cursor: col-resize;
  pointer-events: none;
}

.${TABLE_CSS_CLASSES.table}:hover .column-resize-handle {
  background-color: #7cf;
}

.ProseMirror .tableWrapper > table .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  z-index: 20;
  background-color: #adf;
  cursor: col-resize;
  pointer-events: none;
}

.ProseMirror .tableWrapper > table:hover .column-resize-handle {
  background-color: #7cf;
}
`;
