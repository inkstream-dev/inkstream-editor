import { createPlugin } from '@inkstream/editor-core';
import { Schema } from '@inkstream/pm/model';
import { ToolbarItem } from '@inkstream/editor-core';
import { EditorState } from '@inkstream/pm/state';
import { NodeSelection } from '@inkstream/pm/state';
import { insertPoint } from '@inkstream/pm/transform';

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
      // Block node — images always occupy their own line.
      // This prevents the "image shifts down on Enter" bug that occurs when
      // images are inline atoms: the cursor can land before an inline atom,
      // causing splitBlock to insert a new paragraph before (not after) it.
      group: 'block',
      atom: true,
      attrs: {
        src:    { default: null },
        alt:    { default: null },
        title:  { default: null },
        width:  { default: null },
        height: { default: null },
      },
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
          const imageNode = state.schema.nodes.image.create({ src: null });
          // insertPoint finds the nearest valid block-level position for the
          // image type (always after the current top-level block).
          const pos = insertPoint(state.doc, state.selection.$from.pos, imageNode.type);
          if (pos == null) return false;
          const tr = state.tr.insert(pos, imageNode);
          // NodeSelection on the inserted block image — pressing Enter then
          // calls createParagraphNear, which adds a new paragraph AFTER the
          // image and moves the cursor there. The image never shifts.
          tr.setSelection(NodeSelection.create(tr.doc, pos));
          if (dispatch) dispatch(tr.scrollIntoView());
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
  const pos = insertPoint(state.doc, state.selection.$from.pos, node.type);
  if (pos == null) return false;
  const tr = state.tr.insert(pos, node);
  tr.setSelection(NodeSelection.create(tr.doc, pos));
  if (dispatch) dispatch(tr.scrollIntoView());
  return true;
};

