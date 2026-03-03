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
    blockquote: {
      content: "block+",
      group: "block",
      attrs: {
        align: { default: null },
      },
      toDOM(node) {
        const attrs: { [key: string]: string } = {};
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
        const domAttrs: { [key: string]: string } = {};
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
        target: { default: null },
        rel: { default: null },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs(dom) {
            return {
              href: (dom as HTMLElement).getAttribute("href"),
              title: (dom as HTMLElement).getAttribute("title"),
              target: (dom as HTMLElement).getAttribute("target"),
              rel: (dom as HTMLElement).getAttribute("rel"),
            };
          },
        },
      ],
      toDOM(node) {
        const attrs: Record<string, string> = {};
        if (node.attrs.href) attrs.href = node.attrs.href;
        if (node.attrs.title) attrs.title = node.attrs.title;
        if (node.attrs.target) attrs.target = node.attrs.target;
        if (node.attrs.rel) attrs.rel = node.attrs.rel;
        return ["a", attrs];
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
