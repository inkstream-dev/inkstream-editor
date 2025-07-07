import { EditorState, Transaction } from 'prosemirror-state';
import { NodeType } from 'prosemirror-model';
import { findWrapping } from 'prosemirror-transform';
import { wrapInList, liftListItem } from 'prosemirror-schema-list';
import { findParentNode, getNodeType, isList } from '../helpers/prosemirror';

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export const toggleList = (listTypeOrName: string | NodeType, itemTypeOrName: string | NodeType): Command => {
  return (state, dispatch) => {
    const { schema, selection, tr } = state;
    const { $from, $to } = selection;

    const listType = getNodeType(listTypeOrName, schema);
    const itemType = getNodeType(itemTypeOrName, schema);

    const range = $from.blockRange($to);

    if (!range) {
      return false;
    }

    const parentList = findParentNode(node => isList(node.type.name))(selection);

    // Scenario 1: If the current selection is already in the target list type, unwrap it.
    if (parentList && parentList.node.type === listType) {
      return liftListItem(itemType)(state, dispatch);
    }

    // Scenario 2: If the current selection is in a different list type, convert it.
    if (parentList && (parentList.node.type.name === 'bullet_list' || parentList.node.type.name === 'ordered_list')) {
      const newTr = state.tr;
      newTr.setNodeMarkup(parentList.pos, listType);
      if (dispatch) {
        dispatch(newTr);
      }
      return true;
    }

    // Scenario 3: If not in any list, wrap the selection in the target list type.
    const wrapping = findWrapping(range, listType);

    if (!wrapping) {
      return false;
    }

    return wrapInList(listType)(state, dispatch);
  };
};
