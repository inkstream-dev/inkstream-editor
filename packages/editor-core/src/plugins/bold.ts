import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { toggleMark } from 'prosemirror-commands';
import { inputRules, InputRule } from 'prosemirror-inputrules';
import { Plugin } from '../plugins';

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
};
