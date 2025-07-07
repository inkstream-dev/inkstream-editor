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
  const { $from, $to } = state.selection;
  let tr = state.tr;
  let handled = false;

  if ($from.parent.type.name === 'list_item') {
    // Handle list indentation
    if (sinkListItem(state.schema.nodes.list_item)(state, dispatch)) {
      return true;
    }
  }

  // Collect changes first, then apply
  const changes: { pos: number, text: string, oldLength: number }[] = [];

  state.doc.nodesBetween($from.start($from.depth), $to.end($to.depth), (node, pos) => {
    if (node.isBlock && node.type.name === 'paragraph') {
      const startOfBlockContent = pos + 1; // Start of the paragraph's text content
      const currentText = node.textBetween(0, node.content.size);
      const newText = ' '.repeat(INDENT_SIZE) + currentText;
      changes.push({ pos: startOfBlockContent, text: newText, oldLength: currentText.length });
      handled = true;
    }
  });

  // Apply changes in reverse order to avoid position issues
  for (let i = changes.length - 1; i >= 0; i--) {
    const change = changes[i];
    tr.replaceWith(change.pos, change.pos + change.oldLength, state.schema.text(change.text));
  }

  if (handled && dispatch) {
    dispatch(tr);
    return true;
  }

  return false;
};

const outdentCommand = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  const { $from, $to } = state.selection;
  let tr = state.tr;
  let handled = false;

  if ($from.parent.type.name === 'list_item') {
    // Handle list outdentation
    if (liftListItem(state.schema.nodes.list_item)(state, dispatch)) {
      return true;
    }
  }

  const changes: { pos: number, text: string, oldLength: number }[] = [];

  state.doc.nodesBetween($from.start($from.depth), $to.end($to.depth), (node, pos) => {
    if (node.isBlock && node.type.name === 'paragraph') {
      const startOfBlockContent = pos + 1;
      const currentText = node.textBetween(0, node.content.size);
      const spacesToRemove = Math.min(INDENT_SIZE, currentText.match(/^\s*/)?.[0].length || 0);
      if (spacesToRemove > 0) {
        const newText = currentText.substring(spacesToRemove);
        changes.push({ pos: startOfBlockContent, text: newText, oldLength: currentText.length });
        handled = true;
      }
    }
  });

  for (let i = changes.length - 1; i >= 0; i--) {
    const change = changes[i];
    tr.replaceWith(change.pos, change.pos + change.oldLength, state.schema.text(change.text));
  }

  if (handled && dispatch) {
    dispatch(tr);
    return true;
  }

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