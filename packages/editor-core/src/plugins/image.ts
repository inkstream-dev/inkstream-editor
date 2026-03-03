import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { ToolbarItem } from './index';
import { EditorState } from 'prosemirror-state';

// ---------------------------------------------------------------------------
// SVG icon — landscape frame: rectangle + sun circle + mountain path
// ---------------------------------------------------------------------------
const svgImage = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="1.5" y="2.5" width="13" height="11" rx="1"/>
  <circle cx="5" cy="6.5" r="1.2"/>
  <path d="M1.5 12.5l4-5 2.5 3 2-2.5 4 4.5"/>
</svg>`;

export const imagePlugin = createPlugin({
  name: 'image',
  nodes: {
    image: {
      inline: true,
      attrs: {
        src:    { default: null },
        alt:    { default: null },
        title:  { default: null },
        width:  { default: null },
        height: { default: null },
      },
      group: 'inline',
      draggable: true,
      selectable: true,
      parseDOM: [{
        tag: 'img[src]',
        getAttrs: (dom: HTMLElement) => ({
          src:    dom.getAttribute('src'),
          alt:    dom.getAttribute('alt'),
          title:  dom.getAttribute('title'),
          width:  dom.getAttribute('width'),
          height: dom.getAttribute('height'),
        }),
      }],
      toDOM(node: import('prosemirror-model').Node) {
        const { src, alt, title, width, height } = node.attrs;
        const attrs: Record<string, string | number> = {};
        if (src)    attrs.src    = src;
        if (alt)    attrs.alt    = alt;
        if (title)  attrs.title  = title;
        if (width)  attrs.width  = width;
        if (height) attrs.height = height;
        return ['img', attrs];
      },
    },
  },

  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'image',
        icon: '',
        iconHtml: svgImage,
        tooltip: 'Insert Image',
        command: (state: EditorState, dispatch) => {
          const node = state.schema.nodes.image.create({ src: null });
          const tr = state.tr.replaceSelectionWith(node);
          if (dispatch) dispatch(tr);
          return true;
        },
      },
    ];
  },
});

// ---------------------------------------------------------------------------
// Imperative helper — insert an image with a known URL
// ---------------------------------------------------------------------------
export const insertImage = (
  src: string,
  alt = '',
  title = ''
) => (state: EditorState, dispatch?: (tr: any) => void) => {
  const node = state.schema.nodes.image.create({ src, alt, title });
  const tr = state.tr.replaceSelectionWith(node);
  if (dispatch) dispatch(tr);
  return true;
};

