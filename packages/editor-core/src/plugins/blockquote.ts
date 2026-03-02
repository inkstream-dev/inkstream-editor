import { createPlugin } from './plugin-factory';
import { toggleBlockquote } from '../commands/toggleBlockquote';

export const blockquotePlugin = createPlugin({
  name: 'blockquote',
  tier: 'free',
  description: 'Blockquote support',
  nodes: {
    blockquote: {
      content: 'block+',
      group: 'block',
      parseDOM: [{ tag: 'blockquote' }],
      toDOM() {
        return ['blockquote', 0];
      },
    },
  },
  getToolbarItems: (schema) => [
    {
      id: 'blockquote',
      icon: '" "',
      tooltip: 'Blockquote',
      command: (state, dispatch) => toggleBlockquote(state, dispatch),
      isActive: (state) => {
        const { $from, to } = state.selection;
        if (to > $from.end()) return false;
        return $from.parent.type.name === 'blockquote';
      },
    },
  ],
});
