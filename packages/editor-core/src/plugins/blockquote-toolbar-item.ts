import { toggleBlockquote } from '../commands/toggleBlockquote';
import { EditorState, Transaction } from 'prosemirror-state';

export const blockquoteToolbarItem = {
  id: 'blockquote',
  icon: '“ ”', // Placeholder icon
  tooltip: 'Blockquote',
  command: (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    return toggleBlockquote(state, dispatch);
  },
  isActive: (state: EditorState) => {
    const { selection } = state;
    const { $from, to } = selection;
    if (to > $from.end()) { return false; }
    return $from.parent.type.name === 'blockquote';
  },
};