"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.underlinePlugin = void 0;
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_keymap_1 = require("prosemirror-keymap");
const prosemirror_commands_1 = require("prosemirror-commands");
const prosemirror_state_1 = require("prosemirror-state");
exports.underlinePlugin = (0, plugin_factory_1.createPlugin)({
    name: 'underline',
    getProseMirrorPlugins: (schema) => {
        const plugins = [];
        // Keymap for underline (Ctrl+U or Cmd+U)
        const keys = {};
        keys["Mod-u"] = (0, prosemirror_commands_1.toggleMark)(schema.marks.underline);
        plugins.push((0, prosemirror_keymap_1.keymap)(keys));
        return plugins;
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'underline',
                icon: 'U',
                tooltip: 'Underline',
                command: (0, prosemirror_commands_1.toggleMark)(schema.marks.underline),
                isActive: (state) => {
                    const { from, to, empty } = state.selection;
                    if (empty) {
                        // Check if the mark is active at the cursor position
                        if (state.selection instanceof prosemirror_state_1.TextSelection) {
                            const $cursor = state.selection.$cursor;
                            if ($cursor) {
                                return !!schema.marks.underline.isInSet($cursor.marks() || []);
                            }
                        }
                        return !!schema.marks.underline.isInSet(state.storedMarks || []);
                    }
                    else {
                        // Check if the mark is active within the selection range
                        return state.doc.rangeHasMark(from, to, schema.marks.underline);
                    }
                },
            },
        ];
    },
});
