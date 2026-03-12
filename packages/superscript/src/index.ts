import { createPlugin } from '@inkstream/editor-core';
import { Schema } from '@inkstream/pm/model';
import { EditorState } from '@inkstream/pm/state';
import { toggleMark } from '@inkstream/pm/commands';
import { TextSelection } from '@inkstream/pm/state';
import { ToolbarItem } from '@inkstream/editor-core';

// ---------------------------------------------------------------------------
// SVG icon — "x²" style: lowercase x (lower-left) + superscript 2 (upper-right)
// Stroke-based, inherits currentColor, consistent with other toolbar icons.
// ---------------------------------------------------------------------------
const svgSuperscript = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="1.5" y1="7" x2="6.5" y2="13.5"/>
  <line x1="6.5" y1="7" x2="1.5" y2="13.5"/>
  <path d="M9.5 4.5C9.5 2.8 13.5 2.8 13.5 4.5L9.5 7.5H13.5"/>
</svg>`;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
export const superscriptPlugin = createPlugin({
  name: 'superscript',

  marks: {
    superscript: {
      // Mutually exclusive with subscript: activating superscript removes
      // any subscript mark on the same range (and vice-versa via subscript's
      // own excludes declaration).
      excludes: 'subscript',
      parseDOM: [{ tag: 'sup' }],
      toDOM() {
        return ['sup', 0];
      },
    },
  },

  getKeymap: (schema: Schema) => {
    if (!schema.marks.superscript) return {};
    return {
      'Mod-Shift-.': toggleMark(schema.marks.superscript),
    };
  },

  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    if (!schema.marks.superscript) return [];
    return [
      {
        id: 'superscript',
        icon: '',
        iconHtml: svgSuperscript,
        tooltip: 'Superscript (⌘⇧.)',
        command: toggleMark(schema.marks.superscript),
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          if (empty) {
            if (state.selection instanceof TextSelection) {
              const $cursor = (state.selection as TextSelection).$cursor;
              if ($cursor) {
                return !!schema.marks.superscript.isInSet($cursor.marks() || []);
              }
            }
            return !!schema.marks.superscript.isInSet(state.storedMarks || []);
          }
          return state.doc.rangeHasMark(from, to, schema.marks.superscript);
        },
      },
    ];
  },
});
