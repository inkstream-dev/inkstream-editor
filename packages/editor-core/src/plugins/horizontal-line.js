"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.horizontalLinePlugin = exports.insertHorizontalLine = void 0;
const prosemirror_state_1 = require("prosemirror-state");
const plugin_factory_1 = require("./plugin-factory");
const insertHorizontalLine = (state, dispatch) => {
    const { schema } = state;
    const node = schema.nodes.horizontal_rule.create();
    let tr = state.tr.replaceSelectionWith(node);
    // The selection's anchor is now immediately after the inserted HR node.
    const posAfterHr = tr.selection.anchor;
    // Insert a new paragraph after the horizontal rule.
    // This will place the paragraph at posAfterHr.
    tr = tr.insert(posAfterHr, schema.nodes.paragraph.create());
    // Set the selection to the start of the newly inserted paragraph.
    // Selection.near(pos) finds a valid cursor position near pos.
    tr.setSelection(prosemirror_state_1.Selection.near(tr.doc.resolve(posAfterHr)));
    if (dispatch) {
        dispatch(tr);
    }
    return true;
};
exports.insertHorizontalLine = insertHorizontalLine;
exports.horizontalLinePlugin = (0, plugin_factory_1.createPlugin)({
    name: 'horizontalLine',
    nodes: {
        horizontal_rule: {
            group: 'block',
            parseDOM: [{ tag: 'hr' }],
            toDOM() { return ['hr']; },
        },
    },
    getProseMirrorPlugins: (schema) => {
        return [];
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'horizontalLine',
                icon: '—',
                tooltip: 'Horizontal Line',
                command: exports.insertHorizontalLine,
            },
        ];
    },
});
