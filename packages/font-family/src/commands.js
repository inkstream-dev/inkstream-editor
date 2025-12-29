"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyFontFamily = void 0;
const applyFontFamily = (fontFamily) => {
    return (state, dispatch) => {
        const { schema, selection, tr } = state;
        const { from, to } = selection;
        const markType = schema.marks.font_family;
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
exports.applyFontFamily = applyFontFamily;
