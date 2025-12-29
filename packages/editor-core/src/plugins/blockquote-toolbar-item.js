"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockquoteToolbarItem = void 0;
const toggleBlockquote_1 = require("../commands/toggleBlockquote");
exports.blockquoteToolbarItem = {
    id: 'blockquote',
    icon: '“ ”', // Placeholder icon
    tooltip: 'Blockquote',
    command: (state, dispatch) => {
        return (0, toggleBlockquote_1.toggleBlockquote)(state, dispatch);
    },
    isActive: (state) => {
        const { selection } = state;
        const { $from, to } = selection;
        if (to > $from.end()) {
            return false;
        }
        return $from.parent.type.name === 'blockquote';
    },
};
