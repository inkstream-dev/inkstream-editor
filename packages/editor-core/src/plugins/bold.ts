import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { toggleMark } from 'prosemirror-commands';
import { inputRules, InputRule } from 'prosemirror-inputrules';
import { Plugin, ToolbarItem } from '../plugins';
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

export const boldPlugin: Plugin = {
  name: 'bold',
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const plugins: ProseMirrorPlugin[] = [];

    // Keymap for bold
    const keys: { [key: string]: any } = {};
    keys["Mod-b"] = toggleMark(schema.marks.strong);
    plugins.push(keymap(keys));

    // Input rule for bold (e.g., **text** or __text__)
    const rules = [
      markInputRule(/\*\*([^*]+)\*\*$/, schema.marks.strong),
      markInputRule(/__([^_]+)__$/, schema.marks.strong),
    ];
    plugins.push(inputRules({ rules }));

    return plugins;
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
};