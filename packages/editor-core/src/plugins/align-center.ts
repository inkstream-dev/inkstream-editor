import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { ToolbarItem } from './index';
import { setAlignment } from '../commands/alignment';

export const alignCenterPlugin = createPlugin({
  name: 'alignCenter',
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'alignCenter',
        icon: 'Center',
        tooltip: 'Align Center',
        command: setAlignment('center'),
        isActive: (state: EditorState) => {
          const { selection, doc } = state;
          const { from, to } = selection;
          let allCenterAligned = true;
          let atLeastOneBlock = false;
          doc.nodesBetween(from, to, (node) => {
            if (node.isBlock && node.type.spec.attrs && node.type.spec.attrs.align !== undefined) {
              atLeastOneBlock = true;
              if (node.attrs.align !== 'center') {
                allCenterAligned = false;
                return false;
              }
            }
          });
          return atLeastOneBlock && allCenterAligned;
        },
      },
    ];
  },
});
