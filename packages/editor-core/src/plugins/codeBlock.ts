import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction, TextSelection } from 'prosemirror-state';
import { InputRule, textblockTypeInputRule } from 'prosemirror-inputrules';
import { ToolbarItem } from './index';
import { exitCode, chainCommands, newlineInCode, setBlockType } from 'prosemirror-commands';

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
          const { schema, selection } = state;
          const isActive = selection.$from.parent.type === schema.nodes.code_block;

          if (isActive) {
            return setBlockType(schema.nodes.paragraph)(state, dispatch);
          } else {
            const { from, to } = selection;

            let codeBlock;
            let textContent = '';

            if (selection.empty) {
              codeBlock = schema.nodes.code_block.create();
            } else {
              textContent = state.doc.textBetween(from, to, '\n');
              codeBlock = schema.nodes.code_block.create(null, schema.text(textContent));
            }

            const tr = state.tr.replaceSelectionWith(codeBlock);
            const newSelection = TextSelection.create(tr.doc, from + 1, from + 1 + textContent.length);
            if (dispatch) {
              dispatch(tr.setSelection(newSelection).scrollIntoView());
            }
            return true;
          }
        },
        isActive: (state: EditorState) => state.selection.$from.parent.type === schema.nodes.code_block,
      },
    ];
  },
});
