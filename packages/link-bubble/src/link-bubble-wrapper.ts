import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import type { Plugin } from '@inkstream/editor-core';
import {
  linkBubblePlugin,
  getLinkBubbleToolbarItem,
  openLinkBubble,
  removeLinkAtSelection,
} from './link-bubble';

export const linkBubbleWrapperPlugin: Plugin = {
  name: 'linkBubble',
  tier: 'free',
  getProseMirrorPlugins: () => [linkBubblePlugin],
  getToolbarItems: (schema) => [getLinkBubbleToolbarItem(schema)],
  getInputRules: () => [],
  getKeymap: () => ({
    'Mod-k': (state: EditorState, _dispatch: unknown, view?: EditorView) => {
      if (view) openLinkBubble(view);
      return true;
    },
    'Mod-Shift-k': (state: EditorState, dispatch?: (tr: Transaction) => void) =>
      removeLinkAtSelection(state, dispatch),
  }),
};
