import { toggleList } from './toggleList';
import { createPlugin } from '@inkstream/editor-core';
import { Schema } from '@inkstream/pm/model';
import { EditorState, Plugin as ProseMirrorPlugin, Transaction } from '@inkstream/pm/state';
import { wrapInList, sinkListItem, liftListItem, splitListItem } from '@inkstream/pm/schema-list';
import { keymap } from '@inkstream/pm/keymap';
import { inputRules, InputRule } from '@inkstream/pm/inputrules';
import { ToolbarItem } from '@inkstream/editor-core';

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export const toggleOrderedList: Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    const orderedListType = state.schema.nodes.ordered_list;
    const listItemType = state.schema.nodes.list_item;
    return toggleList(orderedListType, listItemType)(state, dispatch);
};

export const isOrderedListActive = (state: EditorState) => {
    const { $from, to } = state.selection;
    const orderedListType = state.schema.nodes.ordered_list;
    const listItemType = state.schema.nodes.list_item;
    if (!orderedListType || !listItemType) {
        return false;
    }
    let isActive = false;
    state.doc.nodesBetween($from.pos, to, (node) => {
        if (node.type === orderedListType) {
            isActive = true; return false;
        }
    });
    return isActive;
};

export const orderedListPlugin = createPlugin({
    name: 'orderedList',
    nodes: {
        ordered_list: {
            content: 'list_item+',
            group: 'block',
            parseDOM: [{ tag: 'ol' }],
            toDOM() {
                return ['ol', 0];
            },
        },
    },
    getKeymap: (schema: Schema): { [key: string]: any } => {
    const listItemType = schema.nodes.list_item;
    return {
      'Shift-Control-9': toggleOrderedList,
      'Mod-[': liftListItem(listItemType),
      'Mod-]': sinkListItem(listItemType),
    };
  },

  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    return [
        inputRules({
            rules: [new InputRule(/^(\d+)\.\s$/, (state, match, start, end) => {
                let tr = state.tr.delete(start, end);
                const type = state.schema.nodes.ordered_list;
                const listItemType = state.schema.nodes.list_item;

                if (!type || !listItemType) {
                    return null;
                }

                if (isOrderedListActive(state)) {
                    liftListItem(listItemType)(state, (newTr) => { tr = newTr; });
                } else {
                    wrapInList(type, {})(state, (newTr) => { tr = newTr; });
                }
                return tr.docChanged ? tr : null;
            }),
            ],
        }),
        ];
    },
    getToolbarItems: (schema: Schema): ToolbarItem[] => {
        return [{
            id: 'orderedList',
            icon: '1.',
            tooltip:
                'Numbered List',
            command: toggleOrderedList,
            isActive:
                isOrderedListActive,
        },
        ];
    },
});