"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlugin = createPlugin;
function createPlugin(config) {
    return {
        name: config.name,
        tier: config.tier || 'free', // Default to free
        description: config.description,
        nodes: config.nodes,
        marks: config.marks,
        getProseMirrorPlugins: config.getProseMirrorPlugins || (() => []),
        getToolbarItems: config.getToolbarItems || (() => []),
        getInputRules: config.getInputRules || (() => []),
        getKeymap: config.getKeymap || (() => ({})),
    };
}
