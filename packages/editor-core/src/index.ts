import { Schema } from 'prosemirror-model';

// Define a more comprehensive schema for a rich text editor
export const inkstreamSchema = new Schema({
  nodes: {
    doc: { content: "block+", toDOM() { return ["div", 0]; } },
    paragraph: { content: "inline*", group: "block", toDOM() { return ["p", 0]; } },
    blockquote: { content: "block+", group: "block", toDOM() { return ["blockquote", 0]; } },
    horizontal_rule: { group: "block", toDOM() { return ["hr"]; } },
    heading: {
      attrs: { level: { default: 1 } },
      content: "inline*",
      group: "block",
      toDOM(node) { return ["h" + node.attrs.level, 0]; },
    },
    code_block: { content: "text*", marks: "", group: "block", toDOM() { return ["pre", ["code", 0]]; } },
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
  },
});
