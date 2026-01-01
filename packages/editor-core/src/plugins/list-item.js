"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listItemPlugin = void 0;
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_schema_list_1 = require("prosemirror-schema-list");
exports.listItemPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'listItem',
    nodes: {
        list_item: {
            content: 'paragraph block*',
            attrs: {
                align: { default: null },
            },
            parseDOM: [{ tag: 'li' }],
            toDOM(node) {
                const attrs = {};
                if (node.attrs.align) {
                    attrs.style = `text-align: ${node.attrs.align}`;
                }
                return ['li', attrs, 0];
            },
            defining: true,
        },
    },
    getKeymap: (schema) => {
        const listItemType = schema.nodes.list_item;
        return {
            'Tab': (state, dispatch) => {
                return (0, prosemirror_schema_list_1.sinkListItem)(listItemType)(state, dispatch);
            },
            'Shift-Tab': (state, dispatch) => {
                return (0, prosemirror_schema_list_1.liftListItem)(listItemType)(state, dispatch);
            },
        };
    },
});
