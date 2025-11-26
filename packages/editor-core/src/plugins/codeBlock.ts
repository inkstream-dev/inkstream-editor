import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { InputRule, textblockTypeInputRule } from 'prosemirror-inputrules';
import { ToolbarItem } from './index';
import { exitCode, chainCommands, newlineInCode } from 'prosemirror-commands';

const turnIntoCodeBlockOnEnter = (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
  const { $from } = state.selection;
  const node = $from.parent;
  if (node.type.name !== 'paragraph' || node.textContent !== '```') {
      return false;
  }
  if (dispatch) {
      const { schema } = state;
      const codeBlock = schema.nodes.code_block.create();
      const tr = state.tr.replaceWith($from.before(), $from.after(), codeBlock);
      dispatch(tr.scrollIntoView());
  }
  return true;
};

export const codeBlockPlugin = createPlugin({
  name: 'codeBlock',
  nodes: {
    code_block: {
      content: "text*",
      marks: "",
      group: "block",
      code: true,
      defining: true,
      parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
      toDOM() { return ["pre", { class: "inkstream-code-block" }, ["code", 0]]; },
    },
  },
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    return [
      keymap({
        "Enter": chainCommands(turnIntoCodeBlockOnEnter, newlineInCode),
        "Shift-Enter": exitCode,
      }),
    ];
  },
  getInputRules: (schema: Schema): InputRule[] => {
    return [
      textblockTypeInputRule(/^```\s$/, schema.nodes.code_block),
    ];
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'codeBlock',
        icon: '{;}', // Placeholder icon
        tooltip: 'Code Block',
        command: (state: EditorState, dispatch?: (tr: Transaction) => void) => {
          if (dispatch) {
            dispatch(state.tr.replaceSelectionWith(schema.nodes.code_block.create()).scrollIntoView());
          }
          return true;
        },
        isActive: (state: EditorState) => state.selection.$from.parent.type === schema.nodes.code_block,
      },
    ];
  },
});
