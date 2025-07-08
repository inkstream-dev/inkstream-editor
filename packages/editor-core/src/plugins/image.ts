import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { ToolbarItem } from './index';
import { Node } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';

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

    return plugins;
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'image',
        icon: 'Image',
        tooltip: 'Insert Image',
        command: (state: EditorState, dispatch) => {
          const { schema } = state;
          const node = schema.nodes.image.create(); // Create an empty image node
          const tr = state.tr.replaceSelectionWith(node);
          if (dispatch) {
            dispatch(tr);
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
