import { createPlugin } from './plugin-factory';
import { Schema, MarkType } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { ToolbarItem } from './index';
import { TextSelection } from 'prosemirror-state';

// Command to apply a text highlight mark
export function setHighlight(color: string): (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean {
  return function(state: EditorState, dispatch?: (tr: Transaction) => void) {
    const { from, to } = state.selection;
    const markType = state.schema.marks.highlight;
    if (!markType) {
      return false;
    }

    if (dispatch) {
      let tr = state.tr;
      // Remove existing highlight marks in the selection
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.isText) {
          node.marks.forEach(mark => {
            if (mark.type === markType) {
              tr = tr.removeMark(pos, pos + node.nodeSize, mark);
            }
          });
        }
      });
      // Apply the new highlight mark
      tr = tr.addMark(from, to, markType.create({ backgroundColor: color }));
      dispatch(tr);
    }
    return true;
  };
}

export const highlightPlugin = createPlugin({
  name: 'highlight',
  marks: {
    highlight: {
      attrs: { backgroundColor: { default: 'yellow' } },
      inline: true,
      group: 'inline',
      parseDOM: [{
        style: 'background-color',
        getAttrs: (value: string | HTMLElement) => {
          if (typeof value === 'string') {
            return { backgroundColor: value };
          }
          return null;
        }
      }],
      toDOM: (mark: any) => ['span', { style: `background-color: ${mark.attrs.backgroundColor}` }, 0],
    },
  },
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const plugins: ProseMirrorPlugin[] = [];
    return plugins;
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'highlight',
        icon: 'H', // Placeholder icon
        tooltip: 'Highlight',
        type: 'color-picker',
        onColorChange: (color: string) => setHighlight(color),
        command: setHighlight('#FFFF00'), // Default to yellow
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          const markType = state.schema.marks.highlight;
          if (!markType) {
            return false;
          }
          if (empty) {
            if (state.selection instanceof TextSelection) {
              const $cursor = state.selection.$cursor;
              if ($cursor) {
                return !!markType.isInSet($cursor.marks() || []);
              }
            }
            return !!markType.isInSet(state.storedMarks || []);
          } else {
            return state.doc.rangeHasMark(from, to, markType);
          }
        },
      },
    ];
  },
});
