"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alignRightPlugin = void 0;
const plugin_factory_1 = require("./plugin-factory");
const alignment_1 = require("../commands/alignment");
exports.alignRightPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'alignRight',
    getToolbarItems: (schema) => {
        return [
            {
                id: 'alignRight',
                icon: 'Right',
                tooltip: 'Align Right',
                command: (0, alignment_1.setAlignment)('right'),
                isActive: (state) => {
                    const { selection, doc } = state;
                    const { from, to } = selection;
                    let allRightAligned = true;
                    let atLeastOneBlock = false;
                    doc.nodesBetween(from, to, (node) => {
                        if (node.isBlock && node.type.spec.attrs && node.type.spec.attrs.align !== undefined) {
                            atLeastOneBlock = true;
                            if (node.attrs.align !== 'right') {
                                allRightAligned = false;
                                return false;
                            }
                        }
                    });
                    return atLeastOneBlock && allRightAligned;
                },
            },
        ];
    },
});
