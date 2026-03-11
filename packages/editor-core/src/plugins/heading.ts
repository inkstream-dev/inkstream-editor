import { createPlugin } from './plugin-factory';

/**
 * Contributes the `heading` node to the schema (h1–h6).
 *
 * This plugin provides only the node spec (the schema contribution).
 * For the full heading experience — toolbar dropdown (H1–H6), keyboard
 * shortcuts (Mod-Alt-1 through Mod-Alt-6) — use the `@inkstream/heading`
 * package instead, which builds on this node definition.
 */
export const headingPlugin = createPlugin({
  name: 'heading',

  nodes: {
    heading: {
      attrs: {
        level: { default: 1 },
        align: { default: null },
      },
      content: 'inline*',
      marks: '_',
      group: 'block',
      defining: true,
      parseDOM: [
        { tag: 'h1', getAttrs: (dom: Node | string) => ({ level: 1, align: (dom as HTMLElement).style.textAlign || null }) },
        { tag: 'h2', getAttrs: (dom: Node | string) => ({ level: 2, align: (dom as HTMLElement).style.textAlign || null }) },
        { tag: 'h3', getAttrs: (dom: Node | string) => ({ level: 3, align: (dom as HTMLElement).style.textAlign || null }) },
        { tag: 'h4', getAttrs: (dom: Node | string) => ({ level: 4, align: (dom as HTMLElement).style.textAlign || null }) },
        { tag: 'h5', getAttrs: (dom: Node | string) => ({ level: 5, align: (dom as HTMLElement).style.textAlign || null }) },
        { tag: 'h6', getAttrs: (dom: Node | string) => ({ level: 6, align: (dom as HTMLElement).style.textAlign || null }) },
      ],
      toDOM(node: import('@inkstream/pm/model').Node) {
        const attrs: Record<string, string> = {};
        if (node.attrs.align) {
          attrs.style = `text-align: ${node.attrs.align}`;
        }
        return [`h${node.attrs.level}`, attrs, 0];
      },
    },
  },
});
