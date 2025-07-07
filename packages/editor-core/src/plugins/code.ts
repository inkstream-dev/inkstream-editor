import { Schema } from 'prosemirror-model';
import { EditorState, Plugin as ProseMirrorPlugin, Transaction } from 'prosemirror-state';
import { toggleMark } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { inputRules, InputRule } from 'prosemirror-inputrules';
import { Plugin, ToolbarItem } from './';

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export const toggleCode: Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  return toggleMark(state.schema.marks.code)(state, dispatch);
};

export const isCodeActive = (state: EditorState) => {
  const { from, to } = state.selection;
  return state.doc.rangeHasMark(from, to, state.schema.marks.code);
};

export const codePlugin: Plugin = {
  name: 'code',
  marks: {
    code: {
      parseDOM: [{ tag: 'code' }],
      toDOM() { return ['code', 0]; },
    },
  },
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const keys: { [key: string]: Command } = {
      'Mod-e': toggleCode,
      'Mod-`': toggleCode,
    };

    return [
      keymap(keys),
      inputRules({
        rules: [
          new InputRule(/`([^`]+)`$/, (state, match, start, end) => {
            const tr = state.tr;
            if (match[1]) {
              const textStart = start + match[0].indexOf(match[1]);
              const textEnd = textStart + match[1].length;
              tr.delete(textStart - 1, textEnd + 1); // Delete backticks
              tr.addMark(textStart - 1, textEnd - 1, schema.marks.code.create());
            }
            return tr;
          }),
        ],
      }),
    ];
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'code',
        icon: '</>',
        tooltip: 'Code',
        command: toggleCode,
        isActive: isCodeActive,
      },
    ];
  },
};
