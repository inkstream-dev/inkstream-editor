import { createPlugin } from '@inkstream/editor-core';
import { Schema } from '@inkstream/pm/model';
import { EditorState, TextSelection } from '@inkstream/pm/state';
import { toggleMark } from '@inkstream/pm/commands';
import { ToolbarItem } from '@inkstream/editor-core';

// ---------------------------------------------------------------------------
// SVG icon — Strikethrough S: curved S path + horizontal strikethrough bar
// ---------------------------------------------------------------------------
const svgStrike = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M11.5 5.5A3.5 3.5 0 0 0 4.5 8"/>
  <path d="M4.5 8A3.5 3.5 0 0 0 11.5 10.5"/>
  <line x1="3" y1="8" x2="13" y2="8"/>
</svg>`;

export const strikePlugin = createPlugin({
  name: 'strike',

  marks: {
    strike: {
      parseDOM: [
        { tag: 's' },
        { tag: 'del' },
        { tag: 'strike' },
        { style: 'text-decoration=line-through' },
        { style: 'text-decoration-line=line-through' },
      ],
      toDOM() { return ['s', 0]; },
    },
  },

  getKeymap: (schema: Schema) => {
    return { 'Mod-Shift-s': toggleMark(schema.marks.strike) };
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'strike',
        icon: '',
        iconHtml: svgStrike,
        tooltip: 'Strikethrough (⌘⇧S)',
        command: toggleMark(schema.marks.strike),
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          if (empty) {
            if (state.selection instanceof TextSelection) {
              const $cursor = (state.selection as TextSelection).$cursor;
              if ($cursor) return !!schema.marks.strike.isInSet($cursor.marks() || []);
            }
            return !!schema.marks.strike.isInSet(state.storedMarks || []);
          }
          return state.doc.rangeHasMark(from, to, schema.marks.strike);
        },
      },
    ];
  },
});