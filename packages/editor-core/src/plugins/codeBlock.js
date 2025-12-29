"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeBlockPlugin = void 0;
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_keymap_1 = require("prosemirror-keymap");
const prosemirror_state_1 = require("prosemirror-state");
const prosemirror_inputrules_1 = require("prosemirror-inputrules");
const prosemirror_commands_1 = require("prosemirror-commands");
const turnIntoCodeBlockOnEnter = (state, dispatch) => {
    const { $from } = state.selection;
    const node = $from.parent;
    if (node.type.name !== 'paragraph' || node.textContent !== '```') {
        return false;
    }
    if (dispatch) {
        const { schema } = state;
        const codeBlock = schema.nodes.code_block.create();
        const tr = state.tr.replaceWith($from.before(), $from.after(), codeBlock);
        dispatch(tr.scrollIntoView());
    }
    return true;
};
exports.codeBlockPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'codeBlock',
    nodes: {
        code_block: {
            content: "text*",
            marks: "",
            group: "block",
            code: true,
            defining: true,
            parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
            toDOM() { return ["pre", { class: "inkstream-code-block" }, ["code", 0]]; },
        },
    },
    getProseMirrorPlugins: (schema) => {
        return [
            (0, prosemirror_keymap_1.keymap)({
                "Enter": (0, prosemirror_commands_1.chainCommands)(turnIntoCodeBlockOnEnter, prosemirror_commands_1.newlineInCode),
                "Shift-Enter": prosemirror_commands_1.exitCode,
            }),
        ];
    },
    getInputRules: (schema) => {
        return [
            (0, prosemirror_inputrules_1.textblockTypeInputRule)(/^```\s$/, schema.nodes.code_block),
        ];
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'codeBlock',
                icon: '{;}', // Placeholder icon
                tooltip: 'Code Block',
                command: (state, dispatch) => {
                    const { schema, selection } = state;
                    const isActive = selection.$from.parent.type === schema.nodes.code_block;
                    if (isActive) {
                        return (0, prosemirror_commands_1.setBlockType)(schema.nodes.paragraph)(state, dispatch);
                    }
                    else {
                        const { from, to } = selection;
                        let codeBlock;
                        let textContent = '';
                        if (selection.empty) {
                            codeBlock = schema.nodes.code_block.create();
                        }
                        else {
                            textContent = state.doc.textBetween(from, to, '\n');
                            codeBlock = schema.nodes.code_block.create(null, schema.text(textContent));
                        }
                        const tr = state.tr.replaceSelectionWith(codeBlock);
                        const newSelection = prosemirror_state_1.TextSelection.create(tr.doc, from + 1, from + 1 + textContent.length);
                        if (dispatch) {
                            dispatch(tr.setSelection(newSelection).scrollIntoView());
                        }
                        return true;
                    }
                },
                isActive: (state) => state.selection.$from.parent.type === schema.nodes.code_block,
            },
        ];
    },
});
