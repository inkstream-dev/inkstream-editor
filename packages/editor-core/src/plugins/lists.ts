import { Schema } from 'prosemirror-model';
import { EditorState, Transaction, Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { inputRules, InputRule } from 'prosemirror-inputrules';
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { createPlugin } from './plugin-factory';
import { ToolbarItem } from './index';
import { toggleList } from '../commands/toggleList';
import { toggleTaskList, isTaskListActive } from './task-list';

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------
const svgBulletList = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
  <circle cx="2" cy="3.5" r="1.5"/>
  <rect x="5" y="2.5" width="10" height="2" rx="1"/>
  <circle cx="2" cy="8" r="1.5"/>
  <rect x="5" y="7" width="10" height="2" rx="1"/>
  <circle cx="2" cy="12.5" r="1.5"/>
  <rect x="5" y="11.5" width="10" height="2" rx="1"/>
</svg>`;

const svgOrderedList = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
  <text x="1" y="5" font-size="5" font-family="monospace">1.</text>
  <rect x="5" y="2.5" width="10" height="2" rx="1"/>
  <text x="1" y="10" font-size="5" font-family="monospace">2.</text>
  <rect x="5" y="7" width="10" height="2" rx="1"/>
  <text x="1" y="15" font-size="5" font-family="monospace">3.</text>
  <rect x="5" y="11.5" width="10" height="2" rx="1"/>
</svg>`;

const svgTaskList = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
  <rect x="1" y="2" width="3" height="3" rx="0.5" fill="none" stroke="currentColor" stroke-width="1"/>
  <rect x="5" y="2.5" width="10" height="2" rx="1"/>
  <rect x="1" y="6.5" width="3" height="3" rx="0.5"/>
  <path d="M1.5 7.5 L2.3 8.5 L3.5 6.8" stroke="white" stroke-width="0.8" fill="none" stroke-linecap="round"/>
  <rect x="5" y="7" width="10" height="2" rx="1"/>
  <rect x="1" y="11" width="3" height="3" rx="0.5" fill="none" stroke="currentColor" stroke-width="1"/>
  <rect x="5" y="11.5" width="10" height="2" rx="1"/>
</svg>`;

// Neutral list icon for the main dropdown button
const svgListsMenu = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
  <rect x="1" y="2.5" width="14" height="2" rx="1"/>
  <rect x="1" y="7" width="14" height="2" rx="1"/>
  <rect x="1" y="11.5" width="14" height="2" rx="1"/>
</svg>`;

// ---------------------------------------------------------------------------
// Active-state helpers (also exported for backward compat)
// ---------------------------------------------------------------------------
export const isBulletListActive = (state: EditorState): boolean => {
  const t = state.schema.nodes.bullet_list;
  if (!t) return false;
  let active = false;
  state.doc.nodesBetween(state.selection.$from.pos, state.selection.to, (n) => {
    if (n.type === t) { active = true; return false; }
  });
  return active;
};

export const isOrderedListActive = (state: EditorState): boolean => {
  const t = state.schema.nodes.ordered_list;
  if (!t) return false;
  let active = false;
  state.doc.nodesBetween(state.selection.$from.pos, state.selection.to, (n) => {
    if (n.type === t) { active = true; return false; }
  });
  return active;
};

// ---------------------------------------------------------------------------
// Toggle commands
// ---------------------------------------------------------------------------
export const toggleBulletList = (
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
): boolean => {
  const { bullet_list: bulletListType, list_item: listItemType } = state.schema.nodes;
  if (!bulletListType || !listItemType) return false;
  return toggleList(bulletListType, listItemType)(state, dispatch);
};

export const toggleOrderedList = (
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
): boolean => {
  const { ordered_list: orderedListType, list_item: listItemType } = state.schema.nodes;
  if (!orderedListType || !listItemType) return false;
  return toggleList(orderedListType, listItemType)(state, dispatch);
};

// ---------------------------------------------------------------------------
// Markdown input rules for bullet and ordered lists
// ---------------------------------------------------------------------------
function buildListInputRules(schema: Schema): InputRule[] {
  const rules: InputRule[] = [];
  const { bullet_list, ordered_list, list_item } = schema.nodes;

  if (bullet_list && list_item) {
    rules.push(
      new InputRule(/^(-|\*)\s$/, (state, _match, start, end) => {
        if (isBulletListActive(state)) return null; // already in bullet list
        let tr = state.tr.delete(start, end);
        wrapInList(bullet_list)(state, (newTr) => { tr = newTr; });
        return tr.docChanged ? tr : null;
      }),
    );
  }

  if (ordered_list && list_item) {
    rules.push(
      new InputRule(/^(\d+)\.\s$/, (state, _match, start, end) => {
        if (isOrderedListActive(state)) return null;
        let tr = state.tr.delete(start, end);
        wrapInList(ordered_list)(state, (newTr) => { tr = newTr; });
        return tr.docChanged ? tr : null;
      }),
    );
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Unified lists plugin
// ---------------------------------------------------------------------------
export const listsPlugin = createPlugin({
  name: 'lists',

  nodes: {
    bullet_list: {
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ tag: 'ul:not([data-type="task-list"])' }],
      toDOM() { return ['ul', 0]; },
    },
    ordered_list: {
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ tag: 'ol' }],
      toDOM() { return ['ol', 0]; },
    },
    list_item: {
      content: 'paragraph block*',
      defining: true,
      attrs: {
        align: { default: null },
      },
      parseDOM: [{ tag: 'li:not([data-type="task-item"])' }],
      toDOM(node: ProseMirrorNode) {
        const attrs: Record<string, string> = {};
        if (node.attrs.align) attrs.style = `text-align: ${node.attrs.align}`;
        return ['li', attrs, 0];
      },
    },
  },

  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const rules = buildListInputRules(schema);
    return rules.length ? [inputRules({ rules })] : [];
  },

  getToolbarItems: (schema: Schema): ToolbarItem[] => [{
    id: 'lists',
    icon: '',
    iconHtml: svgListsMenu,
    tooltip: 'Lists',
    type: 'dropdown',
    isActive: (state) => isBulletListActive(state) || isOrderedListActive(state) || isTaskListActive(state),
    getChildren: (_state) => [
      {
        id: 'bulletList',
        icon: '',
        iconHtml: svgBulletList,
        label: 'Bullet List',
        tooltip: 'Bullet List (Ctrl+Shift+8)',
        command: toggleBulletList,
        isActive: isBulletListActive,
      },
      {
        id: 'orderedList',
        icon: '',
        iconHtml: svgOrderedList,
        label: 'Numbered List',
        tooltip: 'Numbered List (Ctrl+Shift+7)',
        command: toggleOrderedList,
        isActive: isOrderedListActive,
      },
      {
        id: 'taskList',
        icon: '',
        iconHtml: svgTaskList,
        label: 'Task List',
        tooltip: 'Task List (Ctrl+Shift+9)',
        command: toggleTaskList,
        isActive: isTaskListActive,
      },
    ],
  }],

  getKeymap: (schema: Schema) => {
    const { list_item: listItemType } = schema.nodes;
    if (!listItemType) return {};
    return {
      'Mod-Shift-8': toggleBulletList,
      'Mod-Shift-7': toggleOrderedList,
      'Mod-Shift-9': toggleTaskList,
      'Mod-[': liftListItem(listItemType),
      'Mod-]': sinkListItem(listItemType),
      'Tab': (state: EditorState, dispatch?: (tr: Transaction) => void) =>
        sinkListItem(listItemType)(state, dispatch),
      'Shift-Tab': (state: EditorState, dispatch?: (tr: Transaction) => void) =>
        liftListItem(listItemType)(state, dispatch),
    };
  },
});
