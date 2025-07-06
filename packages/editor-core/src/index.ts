import { Schema } from 'prosemirror-model';

// Define a more comprehensive schema for a rich text editor
export const inkstreamSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    blockquote: { content: "block+", group: "block" },
    horizontal_rule: { group: "block" },
    heading: { attrs: { level: { default: 1 } }, content: "inline*", group: "block" },
    code_block: { content: "text*", marks: "", group: "block" },
    text: { inline: true, group: "inline" },
    hard_break: { inline: true, group: "inline", selectable: false },

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
    strong: {},
    em: {},
    underline: {},
    strike: {},
    code: {},
  },
});