import { createPlugin } from './plugin-factory';
import { Schema, MarkType } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { ToolbarItem } from './index';
import { TextSelection } from 'prosemirror-state';

// Command to apply a text color mark
export function setTextColor(color: string): (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean {
  return function(state: EditorState, dispatch?: (tr: Transaction) => void) {
    const { from, to } = state.selection;
    const markType = state.schema.marks.textColor;
    if (!markType) {
      return false;
    }

    if (dispatch) {
      console.log("setTextColor: Dispatching transaction to apply color", color);
      let tr = state.tr;
      // Remove existing textColor marks in the selection
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.isText) {
          node.marks.forEach(mark => {
            if (mark.type === markType) {
              console.log("setTextColor: Removing existing mark at pos", pos);
              tr = tr.removeMark(pos, pos + node.nodeSize, mark);
            }
          });
        }
      });
      // Apply the new textColor mark
      tr = tr.addMark(from, to, markType.create({ color }));
      dispatch(tr);
    }
    console.log("setTextColor: Command executed, returning true");
    return true;
  };
}

export const textColorPlugin = createPlugin({
  name: 'textColor',
  marks: {
    textColor: {
      attrs: { color: { default: 'black' } },
      inline: true,
      group: 'inline',
      parseDOM: [{
        style: 'color',
        getAttrs: (value: string | HTMLElement) => {
          if (typeof value === 'string') {
            return { color: value };
          }
          return null;
        }
      }],
      toDOM: (mark: any) => ['span', { style: `color: ${mark.attrs.color}` }, 0],
    },
  },
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const plugins: ProseMirrorPlugin[] = [];
    return plugins;
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'textColor',
        icon: 'A', // Placeholder icon, will be replaced with a color picker
        tooltip: 'Text Color',
        type: 'color-picker',
        onColorChange: (color: string) => setTextColor(color),
        command: setTextColor('#000000'), // Default to black
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          const markType = state.schema.marks.textColor;
          if (!markType) {
            console.log("isActive: markType is null");
            return false;
          }
          if (empty) {
            if (state.selection instanceof TextSelection) {
              const $cursor = state.selection.$cursor;
              if ($cursor) {
                const isActive = !!markType.isInSet($cursor.marks() || []);
                console.log("isActive: empty selection, cursor marks, isActive:", isActive);
                return isActive;
              }
            }
            const isActive = !!markType.isInSet(state.storedMarks || []);
            console.log("isActive: empty selection, stored marks, isActive:", isActive);
            return isActive;
          } else {
            const isActive = state.doc.rangeHasMark(from, to, markType);
            console.log("isActive: selection range, isActive:", isActive);
            return isActive;
          }
        },
      },
    ];
  },
});
