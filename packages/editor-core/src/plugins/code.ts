import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { EditorState, Plugin as ProseMirrorPlugin, Transaction } from 'prosemirror-state';
import { toggleMark } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { inputRules, InputRule } from 'prosemirror-inputrules';
import { ToolbarItem } from './index';

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export const toggleCode: Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  return toggleMark(state.schema.marks.code)(state, dispatch);
};

export const setCode: Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  const { from, to } = state.selection;
  const markType = state.schema.marks.code;
  if (!markType) {
    return false;
  }
  if (dispatch) {
    dispatch(state.tr.addMark(from, to, markType.create()));
  }
  return true;
};

export const unsetCode: Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  const markType = state.schema.marks.code;
  if (!markType) {
    return false;
  }
  return toggleMark(markType)(state, dispatch);
};

export const isCodeActive = (state: EditorState) => {
  const { from, to } = state.selection;
  return state.doc.rangeHasMark(from, to, state.schema.marks.code);
};

export const codePlugin = createPlugin({
  name: 'code',
  marks: {
    code: {
      parseDOM: [{ tag: 'code' }],
      toDOM() { return ['code', 0]; },
      excludes: '_',
      code: true,
    },
  },
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    return [];
  },
  getInputRules: (schema: Schema): InputRule[] => {
    return [
      new InputRule(/(^|[^`])`([^`]+)`(?!`)/, (state, match, start, end) => {
        const tr = state.tr;
        if (match[2]) {
          const textStart = start + match[0].indexOf(match[2]);
          const textEnd = textStart + match[2].length;
          tr.delete(textStart - 1, textEnd + 1); // Delete backticks
          tr.addMark(textStart - 1, textEnd - 1, schema.marks.code.create());
        }
        return tr;
      }),
    ];
  },
  getKeymap: (schema: Schema): { [key: string]: any } => {
    const keys: { [key: string]: Command } = {
      'Mod-e': toggleCode,
      'Mod-`': toggleCode,
    };
    return keys;
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
});
