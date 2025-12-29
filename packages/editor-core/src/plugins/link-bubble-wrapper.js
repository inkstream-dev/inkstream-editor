"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkBubbleWrapperPlugin = void 0;
const link_bubble_1 = require("@inkstream/link-bubble");
class LinkBubbleWrapperPlugin {
    constructor() {
        this.name = 'linkBubble';
        this.tier = 'free';
        this.description = 'Link editing bubble menu';
    }
    getProseMirrorPlugins(schema) {
        console.log("LinkBubbleWrapperPlugin: getProseMirrorPlugins called.");
        return [link_bubble_1.linkBubblePlugin];
    }
    getToolbarItems(schema) {
        return [(0, link_bubble_1.getLinkBubbleToolbarItem)(schema)];
    }
}
exports.LinkBubbleWrapperPlugin = LinkBubbleWrapperPlugin;
