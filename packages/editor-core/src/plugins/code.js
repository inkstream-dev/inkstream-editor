"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codePlugin = exports.isCodeActive = exports.unsetCode = exports.setCode = exports.toggleCode = void 0;
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_commands_1 = require("prosemirror-commands");
const prosemirror_inputrules_1 = require("prosemirror-inputrules");
const toggleCode = (state, dispatch) => {
    return (0, prosemirror_commands_1.toggleMark)(state.schema.marks.code)(state, dispatch);
};
exports.toggleCode = toggleCode;
const setCode = (state, dispatch) => {
    const { from, to } = state.selection;
    const markType = state.schema.marks.code;
    if (!markType) {
        return false;
    }
    if (dispatch) {
        dispatch(state.tr.addMark(from, to, markType.create()));
    }
    return true;
};
exports.setCode = setCode;
const unsetCode = (state, dispatch) => {
    const markType = state.schema.marks.code;
    if (!markType) {
        return false;
    }
    return (0, prosemirror_commands_1.toggleMark)(markType)(state, dispatch);
};
exports.unsetCode = unsetCode;
const isCodeActive = (state) => {
    const { from, to } = state.selection;
    return state.doc.rangeHasMark(from, to, state.schema.marks.code);
};
exports.isCodeActive = isCodeActive;
exports.codePlugin = (0, plugin_factory_1.createPlugin)({
    name: 'code',
    marks: {
        code: {
            parseDOM: [{ tag: 'code' }],
            toDOM() { return ['code', 0]; },
            excludes: '_',
            code: true,
        },
    },
    getProseMirrorPlugins: (schema) => {
        return [];
    },
    getInputRules: (schema) => {
        return [
            new prosemirror_inputrules_1.InputRule(/(^|[^`])`([^`]+)`(?!`)/, (state, match, start, end) => {
                const tr = state.tr;
                if (match[2]) {
                    const textStart = start + match[0].indexOf(match[2]);
                    const textEnd = textStart + match[2].length;
                    tr.delete(textStart - 1, textEnd + 1); // Delete backticks
                    tr.addMark(textStart - 1, textEnd - 1, schema.marks.code.create());
                }
                return tr;
            }),
        ];
    },
    getKeymap: (schema) => {
        const keys = {
            'Mod-e': exports.toggleCode,
            'Mod-`': exports.toggleCode,
        };
        return keys;
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'code',
                icon: '</>',
                tooltip: 'Code',
                command: exports.toggleCode,
                isActive: exports.isCodeActive,
            },
        ];
    },
});
