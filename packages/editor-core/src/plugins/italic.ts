import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { toggleMark } from 'prosemirror-commands';
import { InputRule } from 'prosemirror-inputrules';
import { ToolbarItem } from './index';

// ---------------------------------------------------------------------------
// SVG icon — Italic I: top/bottom serif bars + slanted body
// ---------------------------------------------------------------------------
const svgItalic = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="6.5" y1="2.5" x2="9.5" y2="2.5"/>
  <line x1="6.5" y1="13.5" x2="9.5" y2="13.5"/>
  <line x1="9" y1="2.5" x2="7" y2="13.5"/>
</svg>`;

export const italicPlugin = createPlugin({
  name: 'italic',

  getInputRules: (schema: Schema): InputRule[] => [
    // *text* — single asterisk (not preceded/followed by asterisk, avoids bold overlap)
    new InputRule(/(?<!\*)\*([^*]+)\*$/, (state, match, start, end) => {
      if (!match[1]) return null;
      return state.tr.replaceWith(start, end, schema.text(match[1], [schema.marks.em.create()]));
    }),
    // _text_ — single underscore
    new InputRule(/_([^_]+)_$/, (state, match, start, end) => {
      if (!match[1]) return null;
      return state.tr.replaceWith(start, end, schema.text(match[1], [schema.marks.em.create()]));
    }),
  ],

  getKeymap: (schema: Schema) => {
    return { 'Mod-i': toggleMark(schema.marks.em) };
  },

  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'italic',
        icon: '',
        iconHtml: svgItalic,
        tooltip: 'Italic (⌘I)',
        command: toggleMark(schema.marks.em),
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          if (empty) {
            if (state.selection instanceof TextSelection) {
              const $cursor = (state.selection as TextSelection).$cursor;
              if ($cursor) return !!schema.marks.em.isInSet($cursor.marks() || []);
            }
            return !!schema.marks.em.isInSet(state.storedMarks || []);
          }
          return state.doc.rangeHasMark(from, to, schema.marks.em);
        },
      },
    ];
  },
});