import type { Plugin } from '@inkstream/editor-core';
import { linkBubblePlugin, getLinkBubbleToolbarItem } from './link-bubble';

export const linkBubbleWrapperPlugin: Plugin = {
  name: 'linkBubble',
  tier: 'free',
  getProseMirrorPlugins: () => [linkBubblePlugin],
  getToolbarItems: (schema) => [getLinkBubbleToolbarItem(schema)],
  getInputRules: () => [],
  getKeymap: () => ({}),
};
