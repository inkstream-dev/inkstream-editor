import { EditorState, Transaction } from 'prosemirror-state';
import { NodeType, Node, Fragment } from 'prosemirror-model';
import { wrapInList, liftListItem } from 'prosemirror-schema-list';
import { findParentNode, getNodeType, isList } from '../helpers/prosemirror';

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

/**
 * Toggles a list type:
 * - Off → wrap selection in `listType`
 * - Same type → lift items back to paragraphs
 * - Different type → convert container and items in one transaction
 */
export const toggleList = (
  listTypeOrName: string | NodeType,
  itemTypeOrName: string | NodeType,
): Command => {
  return (state, dispatch) => {
    const { schema, selection, tr } = state;
    const listType = getNodeType(listTypeOrName, schema);
    const itemType = getNodeType(itemTypeOrName, schema);

    if (!listType || !itemType) return false;

    const parentList = findParentNode((node) => isList(node.type.name))(selection);

    if (parentList) {
      const { node: listNode, pos: listPos } = parentList;

      // ── Toggle off: already in this list type ──────────────────────────
      if (listNode.type === listType) {
        // Try to lift out of the list first (handles nested lists)
        if (liftListItem(itemType)(state, dispatch)) return true;

        // Fallback: convert items to plain paragraphs
        const { $from, $to } = selection;
        const range = $from.blockRange($to);
        if (range && dispatch) {
          const paraType = schema.nodes.paragraph;
          if (paraType) {
            tr.setBlockType(range.start, range.end, paraType);
            dispatch(tr.scrollIntoView());
            return true;
          }
        }
        return false;
      }

      // ── Convert between list types ─────────────────────────────────────
      const taskListType  = schema.nodes.task_list;
      const taskItemType  = schema.nodes.task_item;
      const listItemType  = schema.nodes.list_item;

      const fromIsTask = taskListType && listNode.type === taskListType;
      const toIsTask   = taskListType && listType === taskListType;

      if (fromIsTask === toIsTask) {
        // Both are plain lists (bullet ↔ ordered) — just change the container
        tr.setNodeMarkup(listPos, listType);
      } else {
        // Crossing the task/plain boundary — rebuild with new item type
        const toItemType: NodeType = toIsTask ? taskItemType : listItemType;
        const newItems: Node[] = [];

        listNode.forEach((child) => {
          const attrs = toIsTask ? { checked: false } : {};
          newItems.push(toItemType.create(attrs, child.content, child.marks));
        });

        const newList = listType.create(listNode.attrs, Fragment.from(newItems));
        tr.replaceWith(listPos, listPos + listNode.nodeSize, newList);
      }

      if (dispatch) dispatch(tr.scrollIntoView());
      return true;
    }

    // ── Not in a list → wrap ────────────────────────────────────────────
    return wrapInList(listType)(state, dispatch);
  };
};
