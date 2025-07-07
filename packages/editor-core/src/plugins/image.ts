import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { ToolbarItem } from './index';
import { Node } from 'prosemirror-model';

export const imagePlugin = createPlugin({
  name: 'image',
  nodes: {
    image: {
      inline: true,
      attrs: {
        src: { default: null },
        alt: { default: null },
        title: { default: null },
      },
      group: "inline",
      draggable: true,
      parseDOM: [{ tag: "img[src]", getAttrs: (dom: HTMLElement) => ({
        src: dom.getAttribute("src"),
        alt: dom.getAttribute("alt"),
        title: dom.getAttribute("title"),
      }) }],
      toDOM(node: Node) { return ["img", node.attrs]; },
    },
  },
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const plugins: ProseMirrorPlugin[] = [];

    // No specific input rules or keymaps for a basic image plugin yet.
    // Image insertion will primarily be via a toolbar button.

    return plugins;
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'image',
        icon: 'Image',
        tooltip: 'Insert Image',
        command: (state, dispatch) => {
          const src = "https://via.placeholder.com/150";
          if (src) {
            insertImage(src)(state, dispatch);
          }
          return true;
        },
      },
    ];
  },
});

// Helper function to create an image node
export const insertImage = (src: string, alt: string = '', title: string = '') =>
  (state: any, dispatch: any) => {
    const { schema } = state;
    const node = schema.nodes.image.create({ src, alt, title });
    const tr = state.tr.replaceSelectionWith(node);
    dispatch(tr);
  };
