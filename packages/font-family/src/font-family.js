"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fontFamilyPlugin = void 0;
const plugin_factory_1 = require("../../editor-core/src/plugins/plugin-factory");
const commands_1 = require("./commands");
exports.fontFamilyPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'fontFamily',
    marks: {
        font_family: {
            attrs: { fontFamily: { default: null } },
            toDOM: (node) => ['span', { style: `font-family: ${node.attrs.fontFamily}` }, 0],
            parseDOM: [
                {
                    style: 'font-family',
                    getAttrs: (value) => ({ fontFamily: value }),
                },
            ],
        },
    },
    getToolbarItems: (schema, options) => {
        const items = [];
        const fontFamilies = options.fontFamilies || [
            'Arial',
            'Times New Roman',
            'Roboto',
        ];
        if (schema.marks.font_family) {
            items.push({
                id: 'fontFamily',
                icon: 'Font',
                tooltip: 'Font Family',
                type: 'dropdown',
                children: fontFamilies.map((fontFamily) => ({
                    id: fontFamily,
                    icon: fontFamily,
                    tooltip: fontFamily,
                    command: (0, commands_1.applyFontFamily)(fontFamily),
                    isActive: (state) => {
                        const { from, to } = state.selection;
                        let isActive = false;
                        state.doc.nodesBetween(from, to, (node) => {
                            if (schema.marks.font_family.isInSet(node.marks)) {
                                const mark = node.marks.find((m) => m.type === schema.marks.font_family);
                                if (mark && mark.attrs.fontFamily === fontFamily) {
                                    isActive = true;
                                }
                            }
                        });
                        return isActive;
                    },
                })),
            });
        }
        return items;
    },
});
