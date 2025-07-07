import { toggleList } from '../commands/toggleList';
import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { inputRules, InputRule } from 'prosemirror-inputrules';
import { EditorState, Plugin as ProseMirrorPlugin, Transaction } from 'prosemirror-state';
import { wrapInList, sinkListItem, liftListItem, splitListItem } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { ToolbarItem } from './index'; // Import Plugin and ToolbarItem interfaces

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export const toggleBulletList: Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  const bulletListType = state.schema.nodes.bullet_list;
  const listItemType = state.schema.nodes.list_item;
  return toggleList(bulletListType, listItemType)(state, dispatch);
};

export const isBulletListActive = (state: EditorState) => {
  const { $from, to } = state.selection;
  const bulletListType = state.schema.nodes.bullet_list;
  const listItemType = state.schema.nodes.list_item;

  if (!bulletListType || !listItemType) {
    return false;
  }

  let isActive = false;
  state.doc.nodesBetween($from.pos, to, (node) => {
    if (node.type === bulletListType) {
      isActive = true;
      return false; // Stop recursing
    }
  });
  return isActive;
};

export const bulletListPlugin = createPlugin({
  name: 'bulletList',
  nodes: {
    bullet_list: {
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ tag: 'ul' }],
      toDOM() { return ['ul', 0]; },
    },
    list_item: {
      content: 'paragraph block*',
      parseDOM: [{ tag: 'li' }],
      toDOM() { return ['li', 0]; },
      defining: true,
    },
  },
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const listItemType = schema.nodes.list_item;
    const keys: { [key: string]: Command } = {
      'Shift-Control-8': toggleBulletList,
      'Mod-[': liftListItem(listItemType),
      'Mod-]': sinkListItem(listItemType),
      'Shift-Enter': (state, dispatch) => {
        dispatch?.(state.tr.replaceSelectionWith(state.schema.nodes.hard_break.create()).scrollIntoView());
        return true;
      },
      
    };
    return [keymap(keys), inputRules({
      rules: [
        new InputRule(/^(-|\*)\s$/, (state, match, start, end) => {
            let tr = state.tr.delete(start, end);
            const type = state.schema.nodes.bullet_list;
            const listItemType = state.schema.nodes.list_item;

            if (!type || !listItemType) {
              return null;
            }

            if (isBulletListActive(state)) {
              liftListItem(listItemType)(state, (newTr) => { tr = newTr; });
            } else {
              wrapInList(type, {})(state, (newTr) => { tr = newTr; });
            }
            return tr.docChanged ? tr : null;
          }),
      ],
    })];
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'bulletList',
        icon: '•',
        tooltip: 'Bullet List',
        command: toggleBulletList,
        isActive: isBulletListActive,
      },
    ];
  },
});

