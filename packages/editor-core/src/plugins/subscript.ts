import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { toggleMark } from 'prosemirror-commands';
import { TextSelection } from 'prosemirror-state';
import { ToolbarItem } from './index';

// ---------------------------------------------------------------------------
// SVG icon — "x₂" style: lowercase x (upper-left) + subscript 2 (lower-right)
// Stroke-based, inherits currentColor, consistent with other toolbar icons.
// ---------------------------------------------------------------------------
const svgSubscript = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="1.5" y1="2.5" x2="6.5" y2="9"/>
  <line x1="6.5" y1="2.5" x2="1.5" y2="9"/>
  <path d="M9.5 11C9.5 9.3 13.5 9.3 13.5 11L9.5 14H13.5"/>
</svg>`;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
export const subscriptPlugin = createPlugin({
  name: 'subscript',

  marks: {
    subscript: {
      // Mutually exclusive with superscript: activating subscript removes
      // any superscript mark on the same range.
      excludes: 'superscript',
      parseDOM: [{ tag: 'sub' }],
      toDOM() {
        return ['sub', 0];
      },
    },
  },

  getKeymap: (schema: Schema) => {
    if (!schema.marks.subscript) return {};
    return {
      'Mod-Shift-,': toggleMark(schema.marks.subscript),
    };
  },

  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    if (!schema.marks.subscript) return [];
    return [
      {
        id: 'subscript',
        icon: '',
        iconHtml: svgSubscript,
        tooltip: 'Subscript (⌘⇧,)',
        command: toggleMark(schema.marks.subscript),
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          if (empty) {
            if (state.selection instanceof TextSelection) {
              const $cursor = (state.selection as TextSelection).$cursor;
              if ($cursor) {
                return !!schema.marks.subscript.isInSet($cursor.marks() || []);
              }
            }
            return !!schema.marks.subscript.isInSet(state.storedMarks || []);
          }
          return state.doc.rangeHasMark(from, to, schema.marks.subscript);
        },
      },
    ];
  },
});
