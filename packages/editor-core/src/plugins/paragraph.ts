import { createPlugin } from './plugin-factory';

/**
 * Contributes the `paragraph` node to the schema.
 *
 * Carries `align` (used by the alignment plugin) and `indent` (used by the
 * indent plugin) attributes so those plugins work without defining them
 * separately.
 */
export const paragraphPlugin = createPlugin({
  name: 'paragraph',

  nodes: {
    paragraph: {
      content: 'inline*',
      group: 'block',
      attrs: {
        align:  { default: null },
        indent: { default: 0 },
      },
      parseDOM: [{
        tag: 'p',
        getAttrs(dom: Node | string) {
          const el = dom as HTMLElement;
          const align = el.style.textAlign || null;
          const paddingMatch = el.style.paddingLeft?.match(/^(\d+(?:\.\d+)?)px$/);
          const indent = paddingMatch ? Math.round(parseFloat(paddingMatch[1]) / 20) : 0;
          return { align: align || null, indent: indent || 0 };
        },
      }],
      toDOM(node: import('@inkstream/pm/model').Node) {
        const attrs: Record<string, string> = {};
        if (node.attrs.align) {
          attrs.style = `text-align: ${node.attrs.align}`;
        }
        if (node.attrs.indent) {
          attrs.style = `${attrs.style || ''}padding-left: ${node.attrs.indent * 20}px;`;
        }
        return ['p', attrs, 0];
      },
    },
  },
});
