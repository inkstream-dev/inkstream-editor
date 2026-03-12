import { EditorState, Transaction } from '@inkstream/pm/state';
import { EditorView } from '@inkstream/pm/view';
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

  marks: {
    link: {
      attrs: {
        href:   { default: null },
        title:  { default: null },
        target: { default: null },
        rel:    { default: null },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs(dom: any) {
            return {
              href:   dom.getAttribute('href'),
              title:  dom.getAttribute('title'),
              target: dom.getAttribute('target'),
              rel:    dom.getAttribute('rel'),
            };
          },
        },
      ],
      toDOM(node: any) {
        const attrs: Record<string, string> = {};
        if (node.attrs.href)   attrs.href   = node.attrs.href;
        if (node.attrs.title)  attrs.title  = node.attrs.title;
        if (node.attrs.target) attrs.target = node.attrs.target;
        if (node.attrs.rel)    attrs.rel    = node.attrs.rel;
        return ['a', attrs];
      },
    },
  },

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
