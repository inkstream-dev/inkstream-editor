"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlugin = exports.PluginManager = exports.inkstreamPlugins = exports.availablePlugins = exports.inkstreamSchema = void 0;
const prosemirror_keymap_1 = require("prosemirror-keymap");
const prosemirror_commands_1 = require("prosemirror-commands");
const prosemirror_schema_list_1 = require("prosemirror-schema-list");
const prosemirror_inputrules_1 = require("prosemirror-inputrules");
const plugins_1 = require("./plugins");
Object.defineProperty(exports, "PluginManager", { enumerable: true, get: function () { return plugins_1.PluginManager; } });
// Import all plugin instances directly
const bold_1 = require("./plugins/bold");
const underline_1 = require("./plugins/underline");
const italic_1 = require("./plugins/italic");
const strike_1 = require("./plugins/strike");
const align_left_1 = require("./plugins/align-left");
const align_center_1 = require("./plugins/align-center");
const align_right_1 = require("./plugins/align-right");
const image_1 = require("./plugins/image");
const indent_1 = require("./plugins/indent");
const bullet_list_1 = require("./plugins/bullet-list");
const ordered_list_1 = require("./plugins/ordered-list");
const code_1 = require("./plugins/code");
const history_1 = require("./plugins/history");
const list_item_1 = require("./plugins/list-item");
const blockquote_1 = require("./plugins/blockquote");
const heading_1 = require("../../heading/src/heading");
const horizontal_line_1 = require("./plugins/horizontal-line");
const textColor_1 = require("./plugins/textColor");
const highlight_1 = require("./plugins/highlight");
const codeBlock_1 = require("./plugins/codeBlock");
const link_bubble_wrapper_1 = require("./plugins/link-bubble-wrapper");
const font_family_1 = require("../../font-family/src/font-family");
const schema_1 = require("./schema");
Object.defineProperty(exports, "inkstreamSchema", { enumerable: true, get: function () { return schema_1.inkstreamSchema; } });
__exportStar(require("./license"), exports);
// Input rules
const buildInputRules = (schema) => {
    const rules = prosemirror_inputrules_1.smartQuotes.concat(prosemirror_inputrules_1.ellipsis, prosemirror_inputrules_1.emDash);
    // Rule for headings (e.g., # Heading)
    rules.push((0, prosemirror_inputrules_1.textblockTypeInputRule)(/^#+\s$/, schema.nodes.heading, (match) => ({ level: match[0].length - 1 })));
    // Rule for blockquotes (e.g., > Quote)
    rules.push((0, prosemirror_inputrules_1.wrappingInputRule)(/^>\s$/, schema.nodes.blockquote));
    // Rule for code blocks (e.g., ``` Code)
    rules.push((0, prosemirror_inputrules_1.textblockTypeInputRule)(/^```\s$/, schema.nodes.code_block));
    // Rules for bold
    rules.push(new prosemirror_inputrules_1.InputRule(/\*\*([^*]+)\*\*$/, (state, match, start, end) => {
        const tr = state.tr;
        if (match[1]) {
            const textStart = start + match[0].indexOf(match[1]);
            const textEnd = textStart + match[1].length;
            tr.delete(textStart, textEnd);
            tr.addMark(textStart, textEnd, schema.marks.strong.create());
        }
        return tr;
    }));
    rules.push(new prosemirror_inputrules_1.InputRule(/__([^_]+)__$/, (state, match, start, end) => {
        const tr = state.tr;
        if (match[1]) {
            const textStart = start + match[0].indexOf(match[1]);
            const textEnd = textStart + match[1].length;
            tr.delete(textStart, textEnd);
            tr.addMark(textStart, textEnd, schema.marks.strong.create());
        }
        return tr;
    }));
    return (0, prosemirror_inputrules_1.inputRules)({
        rules,
    });
};
// Keymap
const buildKeymap = (schema, manager) => {
    const keys = {};
    // Add base keymap commands
    Object.assign(keys, prosemirror_commands_1.baseKeymap);
    // Add keymaps from plugins
    manager.getPlugins().forEach(plugin => {
        const keymap = plugin.getKeymap?.(schema);
        if (keymap) {
            Object.assign(keys, keymap);
        }
    });
    // Add keybinding for hard breaks (Shift-Enter)
    keys["Shift-Enter"] = (state, dispatch) => {
        if (dispatch) {
            dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView());
        }
        return true;
    };
    // Add keybinding for creating a new paragraph (Enter)
    keys["Enter"] = (0, prosemirror_commands_1.chainCommands)((0, prosemirror_schema_list_1.splitListItem)(schema.nodes.list_item), (0, prosemirror_schema_list_1.liftListItem)(schema.nodes.list_item), prosemirror_commands_1.splitBlock);
    return (0, prosemirror_keymap_1.keymap)(keys);
};
// Export all available plugins for consumers to use
exports.availablePlugins = {
    bold: bold_1.boldPlugin,
    underline: underline_1.underlinePlugin,
    italic: italic_1.italicPlugin,
    strike: strike_1.strikePlugin,
    alignLeft: align_left_1.alignLeftPlugin,
    alignCenter: align_center_1.alignCenterPlugin,
    alignRight: align_right_1.alignRightPlugin,
    image: image_1.imagePlugin,
    indent: indent_1.indentPlugin,
    bulletList: bullet_list_1.bulletListPlugin,
    orderedList: ordered_list_1.orderedListPlugin,
    code: code_1.codePlugin,
    history: history_1.historyPlugin,
    listItem: list_item_1.listItemPlugin,
    heading: heading_1.headingPlugin,
    blockquote: new blockquote_1.BlockquotePlugin(),
    horizontalLine: horizontal_line_1.horizontalLinePlugin,
    textColor: textColor_1.textColorPlugin,
    highlight: highlight_1.highlightPlugin,
    codeBlock: codeBlock_1.codeBlockPlugin,
    linkBubble: new link_bubble_wrapper_1.LinkBubbleWrapperPlugin(),
    fontFamily: font_family_1.fontFamilyPlugin,
};
/**
 * Creates ProseMirror plugins from a given array of Inkstream plugins
 * @param plugins - Array of Plugin instances to use
 * @returns Array of ProseMirror plugins configured with the schema
 */
const inkstreamPlugins = (plugins) => {
    // Create a plugin manager instance for this specific set of plugins
    const manager = new plugins_1.PluginManager();
    plugins.forEach(plugin => manager.registerPlugin(plugin));
    const schema = (0, schema_1.inkstreamSchema)(manager);
    return [
        ...manager.getProseMirrorPlugins(schema),
        buildInputRules(schema),
        buildKeymap(schema, manager),
    ];
};
exports.inkstreamPlugins = inkstreamPlugins;
var plugin_factory_1 = require("./plugins/plugin-factory");
Object.defineProperty(exports, "createPlugin", { enumerable: true, get: function () { return plugin_factory_1.createPlugin; } });
