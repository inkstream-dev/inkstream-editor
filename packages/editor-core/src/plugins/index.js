"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManager = void 0;
const blockquote_1 = require("./blockquote");
const blockquote_toolbar_item_1 = require("./blockquote-toolbar-item");
class PluginManager {
    constructor() {
        this.plugins = [];
        this.pluginRegistry = new Map();
    }
    registerPlugin(plugin) {
        this.plugins.push(plugin);
        this.pluginRegistry.set(plugin.name, plugin);
        // console.log(`PluginManager: After registration, plugins count: ${this.plugins.length}`);
    }
    clearPlugins() {
        //console.log("PluginManager: Clearing plugins...");
        this.plugins = [];
        this.pluginRegistry.clear();
        //console.log(`PluginManager: After clearing, plugins count: ${this.plugins.length}`);
    }
    getProseMirrorPlugins(schema) {
        //console.log("PluginManager: Getting ProseMirror plugins for schema:", schema);
        const pmPlugins = this.plugins.flatMap(plugin => {
            const plugins = plugin.getProseMirrorPlugins ? plugin.getProseMirrorPlugins(schema) : [];
            // console.log(`PluginManager: Plugin ${plugin.name} returned ProseMirror plugins:`, plugins);
            return plugins;
        });
        // console.log("PluginManager: All collected ProseMirror plugins:", pmPlugins);
        return pmPlugins;
    }
    getNodes() {
        //console.log("PluginManager: Getting nodes.");
        const nodes = this.plugins.reduce((nodes, plugin) => {
            if (plugin.nodes) {
                Object.assign(nodes, plugin.nodes);
            }
            return nodes;
        }, {
            blockquote: new blockquote_1.BlockquotePlugin().nodes.blockquote,
        });
        //console.log("PluginManager: All collected nodes:", nodes);
        return nodes;
    }
    getToolbarItems(schema, pluginOptions = {}) {
        //console.log(`PluginManager: Collecting toolbar items. Current plugins count: ${this.plugins.length}`);
        const toolbarItemMap = new Map();
        this.plugins.forEach(plugin => {
            let items = [];
            if (plugin.getToolbarItems) {
                const options = pluginOptions[plugin.name] || {};
                items = plugin.getToolbarItems(schema, options);
            }
            //console.log(`PluginManager: Plugin ${plugin.name} returned toolbar items:`, items);
            items.forEach(item => toolbarItemMap.set(item.id, item));
        });
        toolbarItemMap.set(blockquote_toolbar_item_1.blockquoteToolbarItem.id, blockquote_toolbar_item_1.blockquoteToolbarItem);
        //console.log(`PluginManager: Collected toolbar items:`, toolbarItemMap);
        return toolbarItemMap;
    }
    getMarks() {
        return this.plugins.reduce((marks, plugin) => {
            if (plugin.marks) {
                Object.assign(marks, plugin.marks);
            }
            return marks;
        }, {});
    }
    getPlugin(name) {
        return this.pluginRegistry.get(name);
    }
    getPlugins() {
        return Array.from(this.pluginRegistry.values());
    }
}
exports.PluginManager = PluginManager;
