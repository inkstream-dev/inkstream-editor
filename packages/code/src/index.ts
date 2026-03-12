import { createPlugin } from '@inkstream/editor-core';
import { Schema } from '@inkstream/pm/model';
import { EditorState, Transaction, TextSelection } from '@inkstream/pm/state';
import { toggleMark } from '@inkstream/pm/commands';
import { InputRule } from '@inkstream/pm/inputrules';
import { ToolbarItem } from '@inkstream/editor-core';

// ---------------------------------------------------------------------------
// SVG icon — angle brackets <> (universal inline code symbol)
// ---------------------------------------------------------------------------
const svgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="6,3 3,8 6,13"/>
  <polyline points="10,3 13,8 10,13"/>
</svg>`;

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** Toggle the code mark on the current selection or stored marks. */
export const toggleCode = (state: EditorState, dispatch?: (tr: Transaction) => void): boolean =>
  toggleMark(state.schema.marks.code)(state, dispatch);

/** Returns true when the cursor or selection is fully inside a code mark. */
export const isCodeActive = (state: EditorState): boolean => {
  const { selection, schema } = state;
  const markType = schema.marks.code;
  if (!markType) return false;

  const { from, to } = selection;

  // Collapsed cursor — check cursor marks then stored marks
  if (selection.empty) {
    if (selection instanceof TextSelection && selection.$cursor) {
      return !!markType.isInSet(selection.$cursor.marks() || []);
    }
    return !!markType.isInSet(state.storedMarks || []);
  }

  // Range selection — true only when the entire range has the mark
  return state.doc.rangeHasMark(from, to, markType);
};

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
export const codePlugin = createPlugin({
  name: 'code',

  marks: {
    code: {
      // Prevent other marks inside code (bold+code, italic+code etc.)
      excludes: '_',
      // Signals to paste/serialization logic that this is a code context
      code: true,
      parseDOM: [
        { tag: 'code' },
        { tag: 'tt' }, // legacy teletype — still emitted by some HTML exporters
      ],
      toDOM() { return ['code', 0]; },
    },
  },

  getInputRules: (schema: Schema): InputRule[] => [
    // Match `content` (backtick-wrapped, non-empty, no backticks inside).
    // Uses replaceWith to atomically swap the whole matched range for the
    // content-only text with code mark — no manual position arithmetic needed.
    new InputRule(/`([^`]+)`/, (state, match, start, end) => {
      const markType = schema.marks.code;
      if (!markType || !match[1]) return null;
      return state.tr.replaceWith(
        start, end,
        schema.text(match[1], [markType.create()]),
      );
    }),
  ],

  getKeymap: () => ({
    // Mod-e matches Notion's inline code shortcut — memorable and conflict-free
    'Mod-e': toggleCode,
  }),

  getToolbarItems: (_schema: Schema): ToolbarItem[] => [
    {
      id: 'code',
      iconHtml: svgCode,
      tooltip: 'Inline Code (Ctrl+E)',
      command: toggleCode,
      isActive: isCodeActive,
    },
  ],
});
