import { EditorState, Transaction } from 'prosemirror-state';
import { MarkType, Schema } from 'prosemirror-model';

export const applyFontFamily = (fontFamily: string) => {
  return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    const { schema, selection, tr } = state;
    const { from, to } = selection;

    const markType = schema.marks.font_family as MarkType;

    // Remove all font_family marks from the selection
    tr.removeMark(from, to, markType);

    // Add the new font_family mark
    if (fontFamily) {
      const mark = markType.create({ fontFamily });
      tr.addMark(from, to, mark);
    }

    if (dispatch) {
      dispatch(tr);
    }

    return true;
  };
};
