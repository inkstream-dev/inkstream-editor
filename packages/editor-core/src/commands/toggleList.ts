import { EditorState, Transaction } from 'prosemirror-state';
import { NodeType } from 'prosemirror-model';
import { wrapInList, liftListItem } from 'prosemirror-schema-list';
import { getNodeType } from '../helpers/prosemirror';

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export const toggleList = (listTypeOrName: string | NodeType, itemTypeOrName: string | NodeType): Command => {
  return (state, dispatch) => {
    const listType = getNodeType(listTypeOrName, state.schema);
    const itemType = getNodeType(itemTypeOrName, state.schema);

    if (!listType || !itemType) {
      return false;
    }

    // Try to lift first. If successful, we've toggled off.
    if (liftListItem(itemType)(state, dispatch)) {
      return true;
    }

    // If lifting wasn't possible, try to wrap. This will toggle on or convert.
    if (wrapInList(listType)(state, dispatch)) {
      return true;
    }

    return false;
  };
};
