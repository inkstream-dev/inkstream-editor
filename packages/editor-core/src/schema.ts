import { Schema } from 'prosemirror-model';
import { PluginManager } from './plugins';

export const inkstreamSchema = (manager: PluginManager) => new Schema({
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
        const attrs: { [key: string]: string } = {};
        if (node.attrs.align) {
          attrs.style = `text-align: ${node.attrs.align}`;
        }
        if (node.attrs.indent) {
          attrs.style = `${attrs.style || ''} padding-left: ${node.attrs.indent * 20}px;`; // Example: 20px per indent level
        }
        return ["p", attrs, 0];
      },
    },
    blockquote: { content: "block+", group: "block", toDOM() { return ["blockquote", 0]; } },
    heading: {
      attrs: { level: { default: 1 } },
      content: "inline*",
      group: "block",
      toDOM(node) { return ["h" + node.attrs.level, 0]; },
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
