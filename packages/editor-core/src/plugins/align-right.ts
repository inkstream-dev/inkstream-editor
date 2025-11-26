import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { ToolbarItem } from './index';
import { setAlignment } from '../commands/alignment';

export const alignRightPlugin = createPlugin({
  name: 'alignRight',
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'alignRight',
        icon: 'Right',
        tooltip: 'Align Right',
        command: setAlignment('right'),
        isActive: (state: EditorState) => {
          const { selection, doc } = state;
          const { from, to } = selection;
          let allRightAligned = true;
          let atLeastOneBlock = false;
          doc.nodesBetween(from, to, (node) => {
            if (node.isBlock && node.type.spec.attrs && node.type.spec.attrs.align !== undefined) {
              atLeastOneBlock = true;
              if (node.attrs.align !== 'right') {
                allRightAligned = false;
                return false;
              }
            }
          });
          return atLeastOneBlock && allRightAligned;
        },
      },
    ];
  },
});
