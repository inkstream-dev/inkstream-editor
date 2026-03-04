import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { toggleMark } from 'prosemirror-commands';
import { InputRule } from 'prosemirror-inputrules';
import { ToolbarItem } from './index';
import { TextSelection } from 'prosemirror-state';

// ---------------------------------------------------------------------------
// SVG icon — Bold B: vertical bar + two arcs (upper/lower bumps)
// Stroke-based at 1.5px, consistent with toolbar icon style.
// ---------------------------------------------------------------------------
const svgBold = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M4 2v12M4 2h4.5a2.5 2.5 0 0 1 0 5H4M4 8h5a3 3 0 0 1 0 6H4"/>
</svg>`;

// ---------------------------------------------------------------------------
// Helper: mark input rule — atomically replaces full match with marked content
// ---------------------------------------------------------------------------
function markInputRule(regexp: RegExp, markType: any) {
  return new InputRule(regexp, (state, match, start, end) => {
    if (!match[1]) return null;
    const mark = markType.create();
    return state.tr.replaceWith(start, end, state.schema.text(match[1], [mark]));
  });
}

export const boldPlugin = createPlugin({
  name: 'bold',
  getInputRules: (schema: Schema): InputRule[] => {
    return [
      markInputRule(/\*\*([^*]+)\*\*$/, schema.marks.strong),
      markInputRule(/__([^_]+)__$/, schema.marks.strong),
    ];
  },
  getKeymap: (schema: Schema) => {
    return { 'Mod-b': toggleMark(schema.marks.strong) };
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'bold',
        icon: '',
        iconHtml: svgBold,
        tooltip: 'Bold (⌘B)',
        command: toggleMark(schema.marks.strong),
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          if (empty) {
            if (state.selection instanceof TextSelection) {
              const $cursor = (state.selection as TextSelection).$cursor;
              if ($cursor) return !!schema.marks.strong.isInSet($cursor.marks() || []);
            }
            return !!schema.marks.strong.isInSet(state.storedMarks || []);
          }
          return state.doc.rangeHasMark(from, to, schema.marks.strong);
        },
      },
    ];
  },
});