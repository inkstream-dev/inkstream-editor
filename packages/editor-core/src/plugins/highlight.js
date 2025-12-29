"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.highlightPlugin = exports.unsetHighlight = void 0;
exports.setHighlight = setHighlight;
const plugin_factory_1 = require("./plugin-factory");
const prosemirror_state_1 = require("prosemirror-state");
// Command to apply a text highlight mark
function setHighlight(color) {
    return function (state, dispatch) {
        const { from, to } = state.selection;
        const markType = state.schema.marks.highlight;
        if (!markType) {
            return false;
        }
        if (dispatch) {
            let tr = state.tr;
            // Remove existing highlight marks in the selection
            state.doc.nodesBetween(from, to, (node, pos) => {
                if (node.isText) {
                    node.marks.forEach(mark => {
                        if (mark.type === markType) {
                            tr = tr.removeMark(pos, pos + node.nodeSize, mark);
                        }
                    });
                }
            });
            // Apply the new highlight mark
            tr = tr.addMark(from, to, markType.create({ backgroundColor: color }));
            dispatch(tr);
        }
        return true;
    };
}
// Command to unset highlight
const unsetHighlight = (state, dispatch) => {
    const markType = state.schema.marks.highlight;
    if (!markType) {
        return false;
    }
    if (dispatch) {
        let tr = state.tr;
        const { from, to } = state.selection;
        tr = tr.removeMark(from, to, markType);
        dispatch(tr);
    }
    return true;
};
exports.unsetHighlight = unsetHighlight;
exports.highlightPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'highlight',
    marks: {
        highlight: {
            attrs: { backgroundColor: { default: 'yellow' } },
            inline: true,
            group: 'inline',
            parseDOM: [{
                    style: 'background-color',
                    getAttrs: (value) => {
                        if (typeof value === 'string') {
                            return { backgroundColor: value };
                        }
                        return null;
                    }
                }],
            toDOM: (mark) => ['span', { style: `background-color: ${mark.attrs.backgroundColor}` }, 0],
        },
    },
    getProseMirrorPlugins: (schema) => {
        const plugins = [];
        return plugins;
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'highlight',
                icon: 'H', // Placeholder icon
                tooltip: 'Highlight',
                type: 'dropdown',
                children: [
                    {
                        id: 'highlight-yellow',
                        icon: '', // Will be a color swatch
                        tooltip: 'Yellow Highlight',
                        command: setHighlight('yellow'),
                        isActive: (state) => state.doc.rangeHasMark(state.selection.from, state.selection.to, schema.marks.highlight),
                    },
                    {
                        id: 'highlight-green',
                        icon: '', // Will be a color swatch
                        tooltip: 'Green Highlight',
                        command: setHighlight('green'),
                        isActive: (state) => state.doc.rangeHasMark(state.selection.from, state.selection.to, schema.marks.highlight),
                    },
                    {
                        id: 'highlight-blue',
                        icon: '', // Will be a color swatch
                        tooltip: 'Blue Highlight',
                        command: setHighlight('blue'),
                        isActive: (state) => state.doc.rangeHasMark(state.selection.from, state.selection.to, schema.marks.highlight),
                    },
                    {
                        id: 'highlight-unset',
                        icon: 'No Highlight',
                        tooltip: 'Remove Highlight',
                        command: exports.unsetHighlight,
                        isActive: (state) => !state.doc.rangeHasMark(state.selection.from, state.selection.to, schema.marks.highlight),
                    },
                    {
                        id: 'highlight-custom',
                        icon: 'Custom',
                        tooltip: 'Custom Highlight Color',
                        type: 'color-picker',
                        onColorChange: (color) => setHighlight(color),
                        command: setHighlight('#FFFF00'), // Default to yellow for the picker
                    },
                ],
                isActive: (state) => {
                    const { from, to, empty } = state.selection;
                    const markType = schema.marks.highlight;
                    if (!markType) {
                        return false;
                    }
                    if (empty) {
                        if (state.selection instanceof prosemirror_state_1.TextSelection) {
                            const $cursor = state.selection.$cursor;
                            if ($cursor) {
                                return !!markType.isInSet($cursor.marks() || []);
                            }
                        }
                        return !!markType.isInSet(state.storedMarks || []);
                    }
                    else {
                        return state.doc.rangeHasMark(from, to, markType);
                    }
                },
            },
        ];
    },
});
