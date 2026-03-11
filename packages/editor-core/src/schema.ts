import { Schema, Mark } from '@inkstream/pm/model';
import { PluginManager } from './plugins';

/**
 * Builds the ProseMirror schema from the registered plugins.
 *
 * Core schema defines only the two structural primitives every ProseMirror
 * document must have (`doc` and `text`). All other nodes — paragraph, heading,
 * blockquote, hard_break, image, etc. — are contributed by plugins registered
 * in the PluginManager.
 *
 * Marks for inline formatting (bold, italic, link, …) are defined here because
 * ProseMirror requires them to appear in a fixed order relative to the nodes.
 * Plugin-contributed marks are merged in via `manager.getMarks()`.
 */
export const inkstreamSchema = (manager: PluginManager) => new Schema({
  nodes: {
    doc: { content: 'block+', toDOM() { return ['div', 0]; } },
    text: { inline: true, group: 'inline', toDOM(node) { return node.text || ''; } },

    ...manager.getNodes(),
  },

  marks: {
    link: {
      attrs: {
        href:   { default: null },
        title:  { default: null },
        target: { default: null },
        rel:    { default: null },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs(dom) {
            return {
              href:   (dom as HTMLElement).getAttribute('href'),
              title:  (dom as HTMLElement).getAttribute('title'),
              target: (dom as HTMLElement).getAttribute('target'),
              rel:    (dom as HTMLElement).getAttribute('rel'),
            };
          },
        },
      ],
      toDOM(node) {
        const attrs: Record<string, string> = {};
        if (node.attrs.href)   attrs.href   = node.attrs.href;
        if (node.attrs.title)  attrs.title  = node.attrs.title;
        if (node.attrs.target) attrs.target = node.attrs.target;
        if (node.attrs.rel)    attrs.rel    = node.attrs.rel;
        return ['a', attrs];
      },
    },
    strong: {
      parseDOM: [
        { tag: 'strong' },
        {
          tag: 'b',
          getAttrs: (node: Node | string) =>
            (node as HTMLElement).style?.fontWeight !== 'normal' ? null : false,
        },
        {
          style: 'font-weight=400',
          clearMark: (m: Mark) => m.type.name === 'strong',
        },
        {
          style: 'font-weight',
          getAttrs: (value: Node | string) =>
            /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) ? null : false,
        },
      ],
      toDOM() { return ['strong', 0]; },
    },
    em: {
      parseDOM: [
        { tag: 'em' },
        { tag: 'i' },
        { style: 'font-style=italic' },
      ],
      toDOM() { return ['em', 0]; },
    },
    underline: {
      parseDOM: [
        { tag: 'u' },
        { style: 'text-decoration=underline' },
        { style: 'text-decoration-line=underline' },
      ],
      toDOM() { return ['u', 0]; },
    },
    strike: {
      parseDOM: [
        { tag: 's' },
        { tag: 'del' },
        { tag: 'strike' },
        { style: 'text-decoration=line-through' },
        { style: 'text-decoration-line=line-through' },
      ],
      toDOM() { return ['s', 0]; },
    },
    code: { toDOM() { return ['code', 0]; } },

    ...manager.getMarks(),
  },
});
