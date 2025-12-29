"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertImage = exports.imagePlugin = void 0;
const plugin_factory_1 = require("./plugin-factory");
exports.imagePlugin = (0, plugin_factory_1.createPlugin)({
    name: 'image',
    nodes: {
        image: {
            inline: true,
            attrs: {
                src: { default: null },
                alt: { default: null },
                title: { default: null },
                width: { default: null },
                height: { default: null },
            },
            group: "inline",
            draggable: true,
            parseDOM: [{
                    tag: "img[src]",
                    getAttrs: (dom) => ({
                        src: dom.getAttribute("src"),
                        alt: dom.getAttribute("alt"),
                        title: dom.getAttribute("title"),
                        width: dom.getAttribute("width"),
                        height: dom.getAttribute("height"),
                    }),
                }],
            toDOM(node) {
                const { src, alt, title, width, height } = node.attrs;
                const attrs = { src, alt, title };
                if (width)
                    attrs.width = width;
                if (height)
                    attrs.height = height;
                return ["img", attrs];
            },
        },
    },
    getProseMirrorPlugins: (schema) => {
        const plugins = [];
        return plugins;
    },
    getToolbarItems: (schema) => {
        return [
            {
                id: 'image',
                icon: 'Image',
                tooltip: 'Insert Image',
                command: (state, dispatch) => {
                    const { schema } = state;
                    const node = schema.nodes.image.create({ width: 200, height: 200 }); // Create an empty image node with default size
                    const tr = state.tr.replaceSelectionWith(node);
                    if (dispatch) {
                        dispatch(tr);
                    }
                    return true;
                },
            },
        ];
    },
});
// Helper function to create an image node
const insertImage = (src, alt = '', title = '') => (state, dispatch) => {
    const { schema } = state;
    const node = schema.nodes.image.create({ src, alt, title });
    const tr = state.tr.replaceSelectionWith(node);
    dispatch(tr);
};
exports.insertImage = insertImage;
