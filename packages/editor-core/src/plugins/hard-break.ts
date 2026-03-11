import { createPlugin } from './plugin-factory';

/**
 * Contributes the `hard_break` node to the schema (renders as `<br>`).
 *
 * The Shift-Enter keyboard shortcut for inserting a hard break is wired up
 * in `buildKeymap` (index.ts) and fires only when `schema.nodes.hard_break`
 * exists — so omitting this plugin cleanly disables Shift-Enter line breaks.
 */
export const hardBreakPlugin = createPlugin({
  name: 'hardBreak',

  nodes: {
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      toDOM() { return ['br']; },
    },
  },
});
