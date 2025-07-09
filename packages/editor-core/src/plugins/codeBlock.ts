import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { InputRule, textblockTypeInputRule } from 'prosemirror-inputrules';
import { ToolbarItem } from './index';
import { exitCode } from 'prosemirror-commands';

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
    return [];
  },
  getInputRules: (schema: Schema): InputRule[] => {
    return [
      textblockTypeInputRule(/^```\s$/, schema.nodes.code_block, (match) => { console.log("Code block input rule matched!"); return {}; }),
    ];
  },
  getKeymap: (schema: Schema): { [key: string]: any } => {
    const keys: { [key: string]: any } = {};
    keys["Shift-Enter"] = exitCode;
    keys["Enter"] = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
      if (state.selection.$head.parent.type === schema.nodes.code_block) {
        if (dispatch) {
          dispatch(state.tr.insertText("\n"));
        }
        return true;
      }
      return false;
    };
    return keys;
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

