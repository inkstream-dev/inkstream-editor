import { EditorState, Transaction } from '@inkstream/pm/state';
import { setBlockType, lift } from '@inkstream/pm/commands';
import { findWrapping } from '@inkstream/pm/transform';

export function toggleBlockquote(state: EditorState, dispatch?: (tr: Transaction) => void) {
  const { schema, selection } = state;
  const { $from, $to } = selection;
  const range = $from.blockRange($to);

  if (!range) { return false; }

  const blockquoteType = schema.nodes.blockquote;

  if (range.depth >= 1 && range.parent.type === blockquoteType) {
    // If the current selection is inside a blockquote, lift it out
    return lift(state, dispatch);
  } else {
    // Otherwise, wrap it in a blockquote
    const wrapping = findWrapping(range, blockquoteType);
    if (!wrapping) { return false; }
    if (dispatch) {
      dispatch(state.tr.wrap(range, wrapping).scrollIntoView());
    }
    return true;
  }
}
