import { createPlugin } from '@inkstream/editor-core';
import { Schema, Mark, MarkType } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState } from 'prosemirror-state';
import { ToolbarItem } from '@inkstream/editor-core';
import { applyFontFamily } from './commands';

export const fontFamilyPlugin = createPlugin({
  name: 'fontFamily',

  marks: {
    font_family: {
      attrs: { fontFamily: { default: null } },
      toDOM: (node: Mark) => ['span', { style: `font-family: ${node.attrs.fontFamily}` }, 0],
      parseDOM: [
        {
          style: 'font-family',
          getAttrs: (value: any) => ({ fontFamily: value }),
        },
      ],
    },
  },

  getToolbarItems: (schema: Schema, options: any): ToolbarItem[] => {
    const items: ToolbarItem[] = [];

    const fontFamilies = options.fontFamilies || [
      'Arial',
      'Times New Roman',
      'Roboto',
    ];

    if (schema.marks.font_family) {
      items.push({
        id: 'fontFamily',
        icon: 'Font',
        tooltip: 'Font Family',
        type: 'dropdown',
        children: fontFamilies.map((fontFamily: string) => ({
          id: fontFamily,
          icon: fontFamily,
          tooltip: fontFamily,
          command: applyFontFamily(fontFamily),
          isActive: (state: EditorState) => {
            const { from, to } = state.selection;
            let isActive = false;
            state.doc.nodesBetween(from, to, (node) => {
              if (schema.marks.font_family.isInSet(node.marks)) {
                const mark = node.marks.find(
                  (m) => m.type === schema.marks.font_family
                );
                if (mark && mark.attrs.fontFamily === fontFamily) {
                  isActive = true;
                }
              }
            });
            return isActive;
          },
        })),
      });
    }

    return items;
  },
});