"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indentPlugin = void 0;
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_keymap_1 = require("prosemirror-keymap");
const prosemirror_schema_list_1 = require("prosemirror-schema-list");
const INDENT_SIZE = 2; // Default indentation size
const indentCommand = (state, dispatch) => {
    console.log("indentCommand triggered");
    const { selection, tr } = state;
    const { from, to } = selection;
    let handled = false;
    if ((0, prosemirror_schema_list_1.sinkListItem)(state.schema.nodes.list_item)(state, dispatch)) {
        console.log("indentCommand: sinkListItem successful");
        return true;
    }
    state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'paragraph') {
            const currentIndent = node.attrs.indent || 0;
            const newIndent = currentIndent + 1;
            if (newIndent <= 10) { // Limit indentation to 10 levels
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: newIndent });
                handled = true;
            }
        }
    });
    if (handled && dispatch) {
        dispatch(tr);
        console.log("indentCommand: Paragraph indentation successful");
        return true;
    }
    return false;
};
const outdentCommand = (state, dispatch) => {
    console.log("outdentCommand triggered");
    const { selection, tr } = state;
    const { from, to } = selection;
    let handled = false;
    if ((0, prosemirror_schema_list_1.liftListItem)(state.schema.nodes.list_item)(state, dispatch)) {
        console.log("outdentCommand: liftListItem successful");
        return true;
    }
    state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'paragraph') {
            const currentIndent = node.attrs.indent || 0;
            const newIndent = currentIndent - 1;
            if (newIndent >= 0) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: newIndent });
                handled = true;
            }
        }
    });
    if (handled && dispatch) {
        dispatch(tr);
        console.log("outdentCommand: Paragraph outdentation successful");
        return true;
    }
    console.log("outdentCommand: No changes made");
    return false;
};
exports.indentPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'indent',
    getProseMirrorPlugins: () => {
        return [
            (0, prosemirror_keymap_1.keymap)({
                'Tab': indentCommand,
                'Shift-Tab': outdentCommand,
            }),
        ];
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'indent',
                icon: '→',
                tooltip: 'Indent',
                command: indentCommand,
            },
            {
                id: 'outdent',
                icon: '←',
                tooltip: 'Outdent',
                command: outdentCommand,
            },
        ];
    },
});
