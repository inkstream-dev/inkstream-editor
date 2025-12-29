"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAlignment = void 0;
const setAlignment = (align) => (state, dispatch) => {
    const { selection, doc, tr } = state;
    const { from, to } = selection;
    let changed = false;
    doc.nodesBetween(from, to, (node, pos) => {
        // Check if the node type supports alignment
        if (node.isBlock && node.type.spec.attrs && node.type.spec.attrs.align !== undefined) {
            const currentAlign = node.attrs.align;
            const newAlign = currentAlign === align ? null : align;
            if (newAlign !== currentAlign) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, align: newAlign });
                changed = true;
            }
        }
    });
    if (changed && dispatch) {
        dispatch(tr.scrollIntoView());
        return true;
    }
    return false;
};
exports.setAlignment = setAlignment;
