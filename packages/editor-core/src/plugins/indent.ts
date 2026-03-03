import { Schema } from 'prosemirror-model';
import { createPlugin } from './plugin-factory';
import { EditorState, Transaction } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { ToolbarItem } from './index';

// Maximum indent level for block nodes (prevents unbounded indentation)
const MAX_INDENT = 10;

// Node types that support attribute-based indentation.
// Headings are intentionally excluded — indented headings break document hierarchy.
const INDENTABLE_BLOCK_TYPES = new Set(['paragraph']);

// ─── SVG Icons ──────────────────────────────────────────────────────────────

const svgIndent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="2,5.5 5,8 2,10.5"/>
  <line x1="7" y1="3.5" x2="14" y2="3.5"/>
  <line x1="7" y1="8" x2="14" y2="8"/>
  <line x1="7" y1="12.5" x2="14" y2="12.5"/>
</svg>`;

const svgOutdent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="5,5.5 2,8 5,10.5"/>
  <line x1="7" y1="3.5" x2="14" y2="3.5"/>
  <line x1="7" y1="8" x2="14" y2="8"/>
  <line x1="7" y1="12.5" x2="14" y2="12.5"/>
</svg>`;

// ─── Commands ────────────────────────────────────────────────────────────────

/**
 * Indent command — priority chain:
 * 1. Sink task_item (task list nesting)
 * 2. Sink list_item (bullet/ordered list nesting)
 * 3. Increase indent attribute on indentable block nodes (paragraphs)
 */
const indentCommand = (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
  const { list_item, task_item } = state.schema.nodes;

  // List nesting takes priority — preserves structural tree integrity
  if (task_item && sinkListItem(task_item)(state, dispatch)) return true;
  if (list_item && sinkListItem(list_item)(state, dispatch)) return true;

  // Attribute-based indent for non-list blocks
  const { from, to } = state.selection;
  const tr = state.tr;
  let changed = false;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!INDENTABLE_BLOCK_TYPES.has(node.type.name)) return;
    const current = node.attrs.indent ?? 0;
    if (current < MAX_INDENT) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: current + 1 });
      changed = true;
    }
  });

  if (changed && dispatch) {
    dispatch(tr);
    return true;
  }
  return false;
};

/**
 * Outdent command — priority chain:
 * 1. Lift task_item (task list un-nesting)
 * 2. Lift list_item (bullet/ordered list un-nesting)
 * 3. Decrease indent attribute on indentable block nodes (paragraphs)
 */
const outdentCommand = (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
  const { list_item, task_item } = state.schema.nodes;

  // List lifting takes priority — preserves structural tree integrity
  if (task_item && liftListItem(task_item)(state, dispatch)) return true;
  if (list_item && liftListItem(list_item)(state, dispatch)) return true;

  // Attribute-based outdent for non-list blocks
  const { from, to } = state.selection;
  const tr = state.tr;
  let changed = false;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!INDENTABLE_BLOCK_TYPES.has(node.type.name)) return;
    const current = node.attrs.indent ?? 0;
    if (current > 0) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: current - 1 });
      changed = true;
    }
  });

  if (changed && dispatch) {
    dispatch(tr);
    return true;
  }
  return false;
};

// ─── Plugin ──────────────────────────────────────────────────────────────────

export const indentPlugin = createPlugin({
  name: 'indent',

  // Use getProseMirrorPlugins (not getKeymap) so Tab/Shift-Tab run with higher
  // priority than the buildKeymap plugin — critical for the priority chain above
  // to intercept Tab before any lower-priority handlers (e.g. browser tab focus).
  getProseMirrorPlugins: (_schema: Schema) => {
    return [
      keymap({
        'Tab': indentCommand,
        'Shift-Tab': outdentCommand,
      }),
    ];
  },

  getToolbarItems: (_schema: Schema): ToolbarItem[] => [
    {
      id: 'outdent',
      iconHtml: svgOutdent,
      tooltip: 'Decrease indent (Shift+Tab)',
      command: outdentCommand,
    },
    {
      id: 'indent',
      iconHtml: svgIndent,
      tooltip: 'Increase indent (Tab)',
      command: indentCommand,
    },
  ],
});