import { EditorState, Transaction } from 'prosemirror-state';
import { NodeType } from 'prosemirror-model';
import { wrapInList, liftListItem } from 'prosemirror-schema-list';
import { findParentNode, getNodeType, isList } from '../helpers/prosemirror';

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export const toggleList = (listTypeOrName: string | NodeType, itemTypeOrName: string | NodeType): Command => {
  return (state, dispatch) => {
    const listType = getNodeType(listTypeOrName, state.schema);
    const itemType = getNodeType(itemTypeOrName, state.schema);

    if (!listType || !itemType) {
      return false;
    }

    const { selection, tr } = state;
    const parentList = findParentNode(node => isList(node.type.name))(selection);

    // Scenario 1: If already in the target list type, toggle off (lift)
    if (parentList && parentList.node.type === listType) {
      return liftListItem(itemType)(state, dispatch);
    }

    // Scenario 2: If in a different list type, convert it
    if (parentList && parentList.node.type !== listType) {
      // First, lift out of the current list
      let currentTr = tr;
      const liftCommand = liftListItem(itemType);
      if (liftCommand(state, (tempTr) => { currentTr = tempTr; })) {
        // Then, wrap into the new list type
        const stateAfterLift = state.apply(currentTr);
        const wrapCommand = wrapInList(listType);
        if (wrapCommand(stateAfterLift, (tempTr) => {
          tempTr.steps.forEach(step => { currentTr = currentTr.step(step); });
        })) {
          if (dispatch) {
            dispatch(currentTr);
          }
          return true;
        }
      }
      return false;
    }

    // Scenario 3: If not in any list, toggle on (wrap)
    return wrapInList(listType)(state, dispatch);
  };
};
