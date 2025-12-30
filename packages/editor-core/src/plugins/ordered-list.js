"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderedListPlugin = exports.isOrderedListActive = exports.toggleOrderedList = void 0;
const toggleList_1 = require("../commands/toggleList");
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_schema_list_1 = require("prosemirror-schema-list");
const prosemirror_inputrules_1 = require("prosemirror-inputrules");
const toggleOrderedList = (state, dispatch) => {
    const orderedListType = state.schema.nodes.ordered_list;
    const listItemType = state.schema.nodes.list_item;
    return (0, toggleList_1.toggleList)(orderedListType, listItemType)(state, dispatch);
};
exports.toggleOrderedList = toggleOrderedList;
const isOrderedListActive = (state) => {
    const { $from, to } = state.selection;
    const orderedListType = state.schema.nodes.ordered_list;
    const listItemType = state.schema.nodes.list_item;
    if (!orderedListType || !listItemType) {
        return false;
    }
    let isActive = false;
    state.doc.nodesBetween($from.pos, to, (node) => {
        if (node.type === orderedListType) {
            isActive = true;
            return false;
        }
    });
    return isActive;
};
exports.isOrderedListActive = isOrderedListActive;
exports.orderedListPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'orderedList',
    nodes: {
        ordered_list: {
            content: 'list_item+',
            group: 'block',
            parseDOM: [{ tag: 'ol' }],
            toDOM() {
                return ['ol', 0];
            },
        },
    },
    getKeymap: (schema) => {
        const listItemType = schema.nodes.list_item;
        return {
            'Shift-Control-9': exports.toggleOrderedList,
            'Mod-[': (0, prosemirror_schema_list_1.liftListItem)(listItemType),
            'Mod-]': (0, prosemirror_schema_list_1.sinkListItem)(listItemType),
        };
    },
    getProseMirrorPlugins: (schema) => {
        return [
            (0, prosemirror_inputrules_1.inputRules)({
                rules: [new prosemirror_inputrules_1.InputRule(/^(\d+)\.\s$/, (state, match, start, end) => {
                        let tr = state.tr.delete(start, end);
                        const type = state.schema.nodes.ordered_list;
                        const listItemType = state.schema.nodes.list_item;
                        if (!type || !listItemType) {
                            return null;
                        }
                        if ((0, exports.isOrderedListActive)(state)) {
                            (0, prosemirror_schema_list_1.liftListItem)(listItemType)(state, (newTr) => { tr = newTr; });
                        }
                        else {
                            (0, prosemirror_schema_list_1.wrapInList)(type, {})(state, (newTr) => { tr = newTr; });
                        }
                        return tr.docChanged ? tr : null;
                    }),
                ],
            }),
        ];
    },
    getToolbarItems: (schema) => {
        return [{
                id: 'orderedList',
                icon: '1.',
                tooltip: 'Numbered List',
                command: exports.toggleOrderedList,
                isActive: exports.isOrderedListActive,
            },
        ];
    },
});
