import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { toggleMark } from 'prosemirror-commands';
import { ToolbarItem } from './index';

// ---------------------------------------------------------------------------
// SVG icon — Underline U: curved U path + underline bar
// ---------------------------------------------------------------------------
const svgUnderline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M4 2v5.5a4 4 0 0 0 8 0V2"/>
  <line x1="3" y1="14" x2="13" y2="14"/>
</svg>`;

export const underlinePlugin = createPlugin({
  name: 'underline',
  getKeymap: (schema: Schema) => {
    return { 'Mod-u': toggleMark(schema.marks.underline) };
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'underline',
        icon: '',
        iconHtml: svgUnderline,
        tooltip: 'Underline (⌘U)',
        command: toggleMark(schema.marks.underline),
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          if (empty) {
            if (state.selection instanceof TextSelection) {
              const $cursor = (state.selection as TextSelection).$cursor;
              if ($cursor) return !!schema.marks.underline.isInSet($cursor.marks() || []);
            }
            return !!schema.marks.underline.isInSet(state.storedMarks || []);
          }
          return state.doc.rangeHasMark(from, to, schema.marks.underline);
        },
      },
    ];
  },
});