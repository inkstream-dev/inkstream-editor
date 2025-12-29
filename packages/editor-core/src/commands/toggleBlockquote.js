"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleBlockquote = toggleBlockquote;
const prosemirror_commands_1 = require("prosemirror-commands");
const prosemirror_transform_1 = require("prosemirror-transform");
function toggleBlockquote(state, dispatch) {
    const { schema, selection } = state;
    const { $from, $to } = selection;
    const range = $from.blockRange($to);
    if (!range) {
        return false;
    }
    const blockquoteType = schema.nodes.blockquote;
    if (range.depth >= 1 && range.parent.type === blockquoteType) {
        // If the current selection is inside a blockquote, lift it out
        return (0, prosemirror_commands_1.lift)(state, dispatch);
    }
    else {
        // Otherwise, wrap it in a blockquote
        const wrapping = (0, prosemirror_transform_1.findWrapping)(range, blockquoteType);
        if (!wrapping) {
            return false;
        }
        if (dispatch) {
            dispatch(state.tr.wrap(range, wrapping).scrollIntoView());
        }
        return true;
    }
}
