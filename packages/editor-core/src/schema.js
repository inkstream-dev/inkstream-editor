"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inkstreamSchema = void 0;
const prosemirror_model_1 = require("prosemirror-model");
const inkstreamSchema = (manager) => new prosemirror_model_1.Schema({
    nodes: {
        doc: { content: "block+", toDOM() { return ["div", 0]; } },
        paragraph: {
            content: "inline*",
            group: "block",
            attrs: {
                align: { default: null },
                indent: { default: 0 }, // Add indent attribute
            },
            toDOM(node) {
                const attrs = {};
                if (node.attrs.align) {
                    attrs.style = `text-align: ${node.attrs.align}`;
                }
                if (node.attrs.indent) {
                    attrs.style = `${attrs.style || ''} padding-left: ${node.attrs.indent * 20}px;`; // Example: 20px per indent level
                }
                return ["p", attrs, 0];
            },
        },
        blockquote: {
            content: "block+",
            group: "block",
            attrs: {
                align: { default: null },
            },
            toDOM(node) {
                const attrs = {};
                if (node.attrs.align) {
                    attrs.style = `text-align: ${node.attrs.align}`;
                }
                return ["blockquote", attrs, 0];
            }
        },
        heading: {
            attrs: {
                level: { default: 1 },
                align: { default: null },
            },
            content: "inline*",
            group: "block",
            toDOM(node) {
                const domAttrs = {};
                if (node.attrs.align) {
                    domAttrs.style = `text-align: ${node.attrs.align}`;
                }
                return ["h" + node.attrs.level, domAttrs, 0];
            },
        },
        text: { inline: true, group: "inline", toDOM(node) { return node.text || ""; } },
        hard_break: { inline: true, group: "inline", selectable: false, toDOM() { return ["br"]; } },
        // Inline nodes
        image: {
            inline: true,
            attrs: {
                src: { default: null },
                alt: { default: null },
                title: { default: null },
            },
            group: "inline",
            draggable: true,
            toDOM(node) { return ["img", node.attrs]; },
        },
        ...manager.getNodes(), // Dynamically add nodes from plugins
    },
    marks: {
        link: {
            attrs: {
                href: { default: null },
                title: { default: null },
            },
            inclusive: false,
            parseDOM: [
                {
                    tag: "a[href]",
                    getAttrs(dom) {
                        return { href: dom.getAttribute("href"), title: dom.getAttribute("title") };
                    },
                },
            ],
            toDOM(node) {
                return ["a", node.attrs];
            },
        },
        strong: { toDOM() { return ["strong", 0]; } },
        em: { toDOM() { return ["em", 0]; } },
        underline: { toDOM() { return ["u", 0]; } },
        strike: { toDOM() { return ["s", 0]; } },
        code: { toDOM() { return ["code", 0]; } },
        ...manager.getMarks(), // Dynamically add marks from plugins
    },
});
exports.inkstreamSchema = inkstreamSchema;
