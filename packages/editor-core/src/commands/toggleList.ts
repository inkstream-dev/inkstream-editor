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

    // If already in the target list type, toggle off (lift)
    if (parentList && parentList.node.type === listType) {
      return liftListItem(itemType)(state, dispatch);
    }

    // If in a different list type, or not in any list, we either convert or create.
    // The strategy is to first lift (if in a list), then wrap.
    let currentTr = tr;
    let changed = false;

    // Attempt to lift first. This will lift out of any existing list.
    // If it applies, `currentTr` will be updated with the lift steps.
    const liftCommand = liftListItem(itemType);
    if (liftCommand(state, (tempTr) => {
        currentTr = tempTr;
        changed = true;
    })) {
        // If lifting happened, `currentTr` now contains the lift steps.
        // We need to apply the wrap command on the state *after* the lift.
        // The `wrapInList` command will create a new transaction.
        // We then need to append its steps to `currentTr`.
        const stateAfterLift = state.apply(currentTr);
        const wrapCommand = wrapInList(listType);
        if (wrapCommand(stateAfterLift, (tempTr) => {
            tempTr.steps.forEach(step => {
                currentTr = currentTr.step(step);
            });
            changed = true;
        })) {
            // Handled by wrapInList
        }
    } else {
        // If no lifting happened (e.g., not in a list), just try to wrap.
        const wrapCommand = wrapInList(listType);
        if (wrapCommand(state, (tempTr) => {
            currentTr = tempTr;
            changed = true;
        })) {
            // Handled by wrapInList
        }
    }

    if (changed && dispatch) {
        dispatch(currentTr);
        return true;
    }

    return false;
  };
};
