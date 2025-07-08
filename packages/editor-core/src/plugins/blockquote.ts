import { Node, Schema } from 'prosemirror-model';

import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { Plugin, ToolbarItem } from './index';

export class BlockquotePlugin implements Plugin {
  name = 'blockquote';

  nodes = {
    blockquote: {
      content: 'block+',
      group: 'block',
      parseDOM: [{ tag: 'blockquote' }],
      toDOM() {
        return ['blockquote', 0];
      },
    },
  };

  getProseMirrorPlugins(schema: Schema): ProseMirrorPlugin[] {
    return [];
  }

  getToolbarItems(schema: Schema): ToolbarItem[] {
    return [];
  }
}
