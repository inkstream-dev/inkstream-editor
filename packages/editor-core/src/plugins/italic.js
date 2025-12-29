"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.italicPlugin = void 0;
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_commands_1 = require("prosemirror-commands");
const prosemirror_state_1 = require("prosemirror-state");
exports.italicPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'italic',
    getProseMirrorPlugins: (schema) => {
        return [];
    },
    getKeymap: (schema) => {
        // Keymap for italic (Ctrl+I or Cmd+I)
        const keys = {};
        keys["Mod-i"] = (0, prosemirror_commands_1.toggleMark)(schema.marks.em);
        return keys;
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'italic',
                icon: 'I',
                tooltip: 'Italic',
                command: (0, prosemirror_commands_1.toggleMark)(schema.marks.em),
                isActive: (state) => {
                    const { from, to, empty } = state.selection;
                    if (empty) {
                        // Check if the mark is active at the cursor position
                        if (state.selection instanceof prosemirror_state_1.TextSelection) {
                            const $cursor = state.selection.$cursor;
                            if ($cursor) {
                                return !!schema.marks.em.isInSet($cursor.marks() || []);
                            }
                        }
                        return !!schema.marks.em.isInSet(state.storedMarks || []);
                    }
                    else {
                        // Check if the mark is active within the selection range
                        return state.doc.rangeHasMark(from, to, schema.marks.em);
                    }
                },
            },
        ];
    },
});
