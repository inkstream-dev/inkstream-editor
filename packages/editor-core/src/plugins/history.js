"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyPlugin = void 0;
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_history_1 = require("prosemirror-history");
exports.historyPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'history',
    getProseMirrorPlugins: (schema) => {
        return [(0, prosemirror_history_1.history)()];
    },
    getKeymap: (schema) => {
        const keys = {};
        keys["Mod-z"] = prosemirror_history_1.undo;
        keys["Mod-y"] = prosemirror_history_1.redo;
        keys["Shift-Mod-z"] = prosemirror_history_1.redo;
        return keys;
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'undo',
                icon: '↩',
                tooltip: 'Undo',
                command: prosemirror_history_1.undo,
                // isActive: (state: EditorState) => undo(state), // isActive for undo/redo is usually based on history state, not selection
            },
            {
                id: 'redo',
                icon: '↪',
                tooltip: 'Redo',
                command: prosemirror_history_1.redo,
                // isActive: (state: EditorState) => redo(state), // isActive for undo/redo is usually based on history state, not selection
            },
        ];
    },
});
