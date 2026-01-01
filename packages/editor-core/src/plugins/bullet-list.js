"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulletListPlugin = exports.isBulletListActive = exports.toggleBulletList = void 0;
const toggleList_1 = require("../commands/toggleList");
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_inputrules_1 = require("prosemirror-inputrules");
const prosemirror_schema_list_1 = require("prosemirror-schema-list");
const toggleBulletList = (state, dispatch) => {
    const bulletListType = state.schema.nodes.bullet_list;
    const listItemType = state.schema.nodes.list_item;
    return (0, toggleList_1.toggleList)(bulletListType, listItemType)(state, dispatch);
};
exports.toggleBulletList = toggleBulletList;
const isBulletListActive = (state) => {
    const { $from, to } = state.selection;
    const bulletListType = state.schema.nodes.bullet_list;
    const listItemType = state.schema.nodes.list_item;
    if (!bulletListType || !listItemType) {
        return false;
    }
    let isActive = false;
    state.doc.nodesBetween($from.pos, to, (node) => {
        if (node.type === bulletListType) {
            isActive = true;
            return false; // Stop recursing
        }
    });
    return isActive;
};
exports.isBulletListActive = isBulletListActive;
exports.bulletListPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'bulletList',
    nodes: {
        bullet_list: {
            content: 'list_item+',
            group: 'block',
            parseDOM: [{ tag: 'ul' }],
            toDOM() { return ['ul', 0]; },
        },
        list_item: {
            content: 'paragraph block*',
            parseDOM: [{ tag: 'li' }],
            toDOM() { return ['li', 0]; },
            defining: true,
        },
    },
    getKeymap: (schema) => {
        const listItemType = schema.nodes.list_item;
        return {
            'Shift-Control-8': exports.toggleBulletList,
            'Mod-[': (0, prosemirror_schema_list_1.liftListItem)(listItemType),
            'Mod-]': (0, prosemirror_schema_list_1.sinkListItem)(listItemType),
        };
    },
    getProseMirrorPlugins: (schema) => {
        return [(0, prosemirror_inputrules_1.inputRules)({
                rules: [
                    new prosemirror_inputrules_1.InputRule(/^(-|\*)\s$/, (state, match, start, end) => {
                        let tr = state.tr.delete(start, end);
                        const type = state.schema.nodes.bullet_list;
                        const listItemType = state.schema.nodes.list_item;
                        if (!type || !listItemType) {
                            return null;
                        }
                        if ((0, exports.isBulletListActive)(state)) {
                            (0, prosemirror_schema_list_1.liftListItem)(listItemType)(state, (newTr) => { tr = newTr; });
                        }
                        else {
                            (0, prosemirror_schema_list_1.wrapInList)(type, {})(state, (newTr) => { tr = newTr; });
                        }
                        return tr.docChanged ? tr : null;
                    }),
                ],
            })];
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'bulletList',
                icon: '•',
                tooltip: 'Bullet List',
                command: exports.toggleBulletList,
                isActive: exports.isBulletListActive,
            },
        ];
    },
});
