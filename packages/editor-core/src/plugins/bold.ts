import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { toggleMark } from 'prosemirror-commands';
import { inputRules, InputRule } from 'prosemirror-inputrules';
import { ToolbarItem } from './index';
import { TextSelection } from 'prosemirror-state';

// Helper function to create a mark input rule
function markInputRule(regexp: RegExp, markType: any) {
  return new InputRule(regexp, (state, match, start, end) => {
    const tr = state.tr;
    if (match[1]) {
      const textStart = start + match[0].indexOf(match[1]);
      const textEnd = textStart + match[1].length;
      tr.delete(textStart, textEnd);
      tr.addMark(textStart, textEnd, markType.create());
    }
    return tr;
  });
}

export const boldPlugin = createPlugin({
  name: 'bold',
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    return [];
  },
  getInputRules: (schema: Schema): InputRule[] => {
    const rules = [
      markInputRule(/\*\*([^*]+)\*\*$/, schema.marks.strong),
      markInputRule(/__([^_]+)__$/, schema.marks.strong),
    ];
    return rules;
  },
  getKeymap: (schema: Schema): { [key: string]: any } => {
    const keys: { [key: string]: any } = {};
    keys["Mod-b"] = toggleMark(schema.marks.strong);
    return keys;
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'bold',
        icon: 'B',
        tooltip: 'Bold',
        command: toggleMark(schema.marks.strong),
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          if (empty) {
            // Check if the mark is active at the cursor position
            if (state.selection instanceof TextSelection) {
              const $cursor = state.selection.$cursor;
              if ($cursor) {
                return !!schema.marks.strong.isInSet($cursor.marks() || []);
              }
            }
            return !!schema.marks.strong.isInSet(state.storedMarks || []);
          } else {
            // Check if the mark is active within the selection range
            return state.doc.rangeHasMark(from, to, schema.marks.strong);
          }
        },
      },
    ];
  },
});