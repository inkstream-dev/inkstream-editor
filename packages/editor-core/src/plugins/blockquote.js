"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockquotePlugin = void 0;
class BlockquotePlugin {
    constructor() {
        this.name = 'blockquote';
        this.tier = 'free';
        this.description = 'Blockquote support';
        this.nodes = {
            blockquote: {
                content: 'block+',
                group: 'block',
                parseDOM: [{ tag: 'blockquote' }],
                toDOM() {
                    return ['blockquote', 0];
                },
            },
        };
    }
    getProseMirrorPlugins(schema) {
        return [];
    }
    getToolbarItems(schema) {
        return [];
    }
}
exports.BlockquotePlugin = BlockquotePlugin;
