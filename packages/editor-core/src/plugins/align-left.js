"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alignLeftPlugin = void 0;
const plugin_factory_1 = require("./plugin-factory");
const alignment_1 = require("../commands/alignment");
exports.alignLeftPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'alignLeft',
    getToolbarItems: (schema) => {
        return [
            {
                id: 'alignLeft',
                icon: 'Left',
                tooltip: 'Align Left',
                command: (0, alignment_1.setAlignment)('left'),
                isActive: (state) => {
                    const { selection, doc } = state;
                    const { from, to } = selection;
                    let allLeftAligned = true;
                    let atLeastOneBlock = false;
                    doc.nodesBetween(from, to, (node) => {
                        if (node.isBlock && node.type.spec.attrs && node.type.spec.attrs.align !== undefined) {
                            atLeastOneBlock = true;
                            if (node.attrs.align !== 'left') {
                                allLeftAligned = false;
                                return false;
                            }
                        }
                    });
                    return atLeastOneBlock && allLeftAligned;
                },
            },
        ];
    },
});
