import { createPlugin } from '@inkstream/editor-core';
import { Schema } from '@inkstream/pm/model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from '@inkstream/pm/state';
import { keymap } from '@inkstream/pm/keymap';
import { liftListItem, sinkListItem, splitListItem } from '@inkstream/pm/schema-list';
import { Node as ProseMirrorNode } from '@inkstream/pm/model';

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export const listItemPlugin = createPlugin({
  name: 'listItem',
  nodes: {
    list_item: {
      content: 'paragraph block*',
      attrs: {
        align: { default: null },
      },
      parseDOM: [{ tag: 'li' }],
      toDOM(node: ProseMirrorNode) {
        const attrs: { [key: string]: string } = {};
        if (node.attrs.align) {
          attrs.style = `text-align: ${node.attrs.align}`;
        }
        return ['li', attrs, 0];
      },
      defining: true,
    },
  },
  getKeymap: (schema: Schema): { [key: string]: any } => {
    const listItemType = schema.nodes.list_item;
    return {
      'Tab': (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        return sinkListItem(listItemType)(state, dispatch);
      },
      'Shift-Tab': (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        return liftListItem(listItemType)(state, dispatch);
      },
    };
  },
});
