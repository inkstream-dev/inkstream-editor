import { Schema } from 'prosemirror-model';
import { createPlugin } from './plugin-factory';
import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { EditorState, Transaction } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { NodeRange } from 'prosemirror-model';
import { liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { ToolbarItem } from './index';

const INDENT_SIZE = 2; // Default indentation size

const indentCommand = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  console.log("indentCommand triggered");
  const { selection, tr } = state;
  const { from, to } = selection;
  let handled = false;

  if (sinkListItem(state.schema.nodes.list_item)(state, dispatch)) {
    console.log("indentCommand: sinkListItem successful");
    return true;
  }

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'paragraph') {
      const currentIndent = node.attrs.indent || 0;
      const newIndent = currentIndent + 1;
      if (newIndent <= 10) { // Limit indentation to 10 levels
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: newIndent });
        handled = true;
      }
    }
  });

  if (handled && dispatch) {
    dispatch(tr);
    console.log("indentCommand: Paragraph indentation successful");
    return true;
  }

  console.log("indentCommand: No changes made");
  return false;
};

const outdentCommand = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  console.log("outdentCommand triggered");
  const { selection, tr } = state;
  const { from, to } = selection;
  let handled = false;

  if (liftListItem(state.schema.nodes.list_item)(state, dispatch)) {
    console.log("outdentCommand: liftListItem successful");
    return true;
  }

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'paragraph') {
      const currentIndent = node.attrs.indent || 0;
      const newIndent = currentIndent - 1;
      if (newIndent >= 0) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: newIndent });
        handled = true;
      }
    }
  });

  if (handled && dispatch) {
    dispatch(tr);
    console.log("outdentCommand: Paragraph outdentation successful");
    return true;
  }

  console.log("outdentCommand: No changes made");
  return false;
};

export const indentPlugin = createPlugin({
  name: 'indent',
  getProseMirrorPlugins: () => {
    return [
      keymap({
        'Tab': indentCommand,
        'Shift-Tab': outdentCommand,
      }),
    ];
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'indent',
        icon: '→',
        tooltip: 'Indent',
        command: indentCommand,
      },
      {
        id: 'outdent',
        icon: '←',
        tooltip: 'Outdent',
        command: outdentCommand,
      },
    ];
  },
});