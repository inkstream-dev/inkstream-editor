"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alignCenterPlugin = void 0;
const plugin_factory_1 = require("./plugin-factory");
const alignment_1 = require("../commands/alignment");
exports.alignCenterPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'alignCenter',
    getToolbarItems: (schema) => {
        return [
            {
                id: 'alignCenter',
                icon: 'Center',
                tooltip: 'Align Center',
                command: (0, alignment_1.setAlignment)('center'),
                isActive: (state) => {
                    const { selection, doc } = state;
                    const { from, to } = selection;
                    let allCenterAligned = true;
                    let atLeastOneBlock = false;
                    doc.nodesBetween(from, to, (node) => {
                        if (node.isBlock && node.type.spec.attrs && node.type.spec.attrs.align !== undefined) {
                            atLeastOneBlock = true;
                            if (node.attrs.align !== 'center') {
                                allCenterAligned = false;
                                return false;
                            }
                        }
                    });
                    return atLeastOneBlock && allCenterAligned;
                },
            },
        ];
    },
});
