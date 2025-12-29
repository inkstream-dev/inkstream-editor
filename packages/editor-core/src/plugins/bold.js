"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boldPlugin = void 0;
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_commands_1 = require("prosemirror-commands");
const prosemirror_inputrules_1 = require("prosemirror-inputrules");
const prosemirror_state_1 = require("prosemirror-state");
// Helper function to create a mark input rule
function markInputRule(regexp, markType) {
    return new prosemirror_inputrules_1.InputRule(regexp, (state, match, start, end) => {
        const tr = state.tr;
        if (match[1]) {
            const textStart = start + match[0].indexOf(match[1]);
            const textEnd = textStart + match[1].length;
            tr.delete(textStart, textEnd);
            tr.addMark(textStart, textEnd, markType.create());
        }
        return tr;
    });
}
exports.boldPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'bold',
    getProseMirrorPlugins: (schema) => {
        return [];
    },
    getInputRules: (schema) => {
        const rules = [
            markInputRule(/\*\*([^*]+)\*\*$/, schema.marks.strong),
            markInputRule(/__([^_]+)__$/, schema.marks.strong),
        ];
        return rules;
    },
    getKeymap: (schema) => {
        const keys = {};
        keys["Mod-b"] = (0, prosemirror_commands_1.toggleMark)(schema.marks.strong);
        return keys;
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'bold',
                icon: 'B',
                tooltip: 'Bold',
                command: (0, prosemirror_commands_1.toggleMark)(schema.marks.strong),
                isActive: (state) => {
                    const { from, to, empty } = state.selection;
                    if (empty) {
                        // Check if the mark is active at the cursor position
                        if (state.selection instanceof prosemirror_state_1.TextSelection) {
                            const $cursor = state.selection.$cursor;
                            if ($cursor) {
                                return !!schema.marks.strong.isInSet($cursor.marks() || []);
                            }
                        }
                        return !!schema.marks.strong.isInSet(state.storedMarks || []);
                    }
                    else {
                        // Check if the mark is active within the selection range
                        return state.doc.rangeHasMark(from, to, schema.marks.strong);
                    }
                },
            },
        ];
    },
});
