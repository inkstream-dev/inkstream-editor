import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { setBlockType } from 'prosemirror-commands';
import { ToolbarItem } from './index';

const setAlign = (align: string) =>
  function (state: EditorState, dispatch?: (tr: Transaction) => void) {
    const { selection, tr } = state;
    const { from, to } = selection;
    let changed = false;

    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === 'paragraph') {
        const currentAlign = node.attrs.align;
        if (currentAlign !== align) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, align });
          changed = true;
        }
      }
    });

    if (changed && dispatch) {
      dispatch(tr);
      return true;
    }
    return false;
  };

export const alignLeftPlugin = createPlugin({
  name: 'alignLeft',
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    return [];
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'alignLeft',
        icon: 'Left',
        tooltip: 'Align Left',
        command: setAlign('left'),
        isActive: (state: EditorState) => {
          const { selection } = state;
          const { from, to } = selection;
          let allLeftAligned = true;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.type.name === 'paragraph' && node.attrs.align !== 'left') {
              allLeftAligned = false;
            }
          });
          return allLeftAligned;
        },
      },
    ];
  },
});