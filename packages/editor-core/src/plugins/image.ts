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
        width: { default: null },
        height: { default: null },
      },
      group: "inline",
      draggable: true,
      parseDOM: [{
        tag: "img[src]",
        getAttrs: (dom: HTMLElement) => ({
          src: dom.getAttribute("src"),
          alt: dom.getAttribute("alt"),
          title: dom.getAttribute("title"),
          width: dom.getAttribute("width"),
          height: dom.getAttribute("height"),
        }),
      }],
      toDOM(node: Node) {
        const { src, alt, title, width, height } = node.attrs;
        const attrs: { [key: string]: any } = { src, alt, title };
        if (width) attrs.width = width;
        if (height) attrs.height = height;
        return ["img", attrs];
      },
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
          const node = schema.nodes.image.create({ width: 200, height: 200 }); // Create an empty image node with default size
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
