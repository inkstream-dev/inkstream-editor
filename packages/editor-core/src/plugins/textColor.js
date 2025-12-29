"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textColorPlugin = void 0;
exports.setTextColor = setTextColor;
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_state_1 = require("prosemirror-state");
// Command to apply a text color mark
function setTextColor(color) {
    return function (state, dispatch) {
        const { from, to } = state.selection;
        const markType = state.schema.marks.textColor;
        if (!markType) {
            return false;
        }
        if (dispatch) {
            console.log("setTextColor: Dispatching transaction to apply color", color);
            let tr = state.tr;
            // Remove existing textColor marks in the selection
            state.doc.nodesBetween(from, to, (node, pos) => {
                if (node.isText) {
                    node.marks.forEach(mark => {
                        if (mark.type === markType) {
                            console.log("setTextColor: Removing existing mark at pos", pos);
                            tr = tr.removeMark(pos, pos + node.nodeSize, mark);
                        }
                    });
                }
            });
            // Apply the new textColor mark
            tr = tr.addMark(from, to, markType.create({ color }));
            dispatch(tr);
        }
        console.log("setTextColor: Command executed, returning true");
        return true;
    };
}
exports.textColorPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'textColor',
    marks: {
        textColor: {
            attrs: { color: { default: 'black' } },
            inline: true,
            group: 'inline',
            parseDOM: [{
                    style: 'color',
                    getAttrs: (value) => {
                        if (typeof value === 'string') {
                            return { color: value };
                        }
                        return null;
                    }
                }],
            toDOM: (mark) => ['span', { style: `color: ${mark.attrs.color}` }, 0],
        },
    },
    getProseMirrorPlugins: (schema) => {
        const plugins = [];
        return plugins;
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'textColor',
                icon: 'A', // Placeholder icon, will be replaced with a color picker
                tooltip: 'Text Color',
                type: 'color-picker',
                onColorChange: (color) => setTextColor(color),
                command: setTextColor('#000000'), // Default to black
                isActive: (state) => {
                    const { from, to, empty } = state.selection;
                    const markType = state.schema.marks.textColor;
                    if (!markType) {
                        console.log("isActive: markType is null");
                        return false;
                    }
                    if (empty) {
                        if (state.selection instanceof prosemirror_state_1.TextSelection) {
                            const $cursor = state.selection.$cursor;
                            if ($cursor) {
                                const isActive = !!markType.isInSet($cursor.marks() || []);
                                console.log("isActive: empty selection, cursor marks, isActive:", isActive);
                                return isActive;
                            }
                        }
                        const isActive = !!markType.isInSet(state.storedMarks || []);
                        console.log("isActive: empty selection, stored marks, isActive:", isActive);
                        return isActive;
                    }
                    else {
                        const isActive = state.doc.rangeHasMark(from, to, markType);
                        console.log("isActive: selection range, isActive:", isActive);
                        return isActive;
                    }
                },
            },
        ];
    },
});
