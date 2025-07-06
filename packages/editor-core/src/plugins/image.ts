import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { Plugin } from '../plugins';
import { Node } from 'prosemirror-model';

export const imagePlugin: Plugin = {
  name: 'image',
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const plugins: ProseMirrorPlugin[] = [];

    // No specific input rules or keymaps for a basic image plugin yet.
    // Image insertion will primarily be via a toolbar button.

    return plugins;
  },
};

// Helper function to create an image node
export const insertImage = (src: string, alt: string = '', title: string = '') =>
  (state: any, dispatch: any) => {
    const { schema } = state;
    const node = schema.nodes.image.create({ src, alt, title });
    const tr = state.tr.replaceSelectionWith(node);
    dispatch(tr);
  };
