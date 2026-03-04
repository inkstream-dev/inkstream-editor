import { createPlugin } from './plugin-factory';
import { toggleBlockquote } from '../commands/toggleBlockquote';

// ---------------------------------------------------------------------------
// SVG icon — vertical bar + three content lines (classic quote mark style)
// ---------------------------------------------------------------------------
const svgBlockquote = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
  <line x1="2" y1="3" x2="2" y2="13" stroke-width="2.5"/>
  <line x1="5" y1="4.5" x2="14" y2="4.5"/>
  <line x1="5" y1="8" x2="13" y2="8"/>
  <line x1="5" y1="11.5" x2="14" y2="11.5"/>
</svg>`;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
// NOTE: The blockquote node spec (content, group, align attr, parseDOM/toDOM)
// lives in schema.ts — do NOT redefine `nodes` here. Redefining it would
// override the schema.ts definition and silently lose the `align` attribute
// (breaking text alignment inside blockquotes).
export const blockquotePlugin = createPlugin({
  name: 'blockquote',
  tier: 'free',
  description: 'Blockquote support',

  getKeymap: () => ({
    // Mod-Shift-B — mnemonic for "Blockquote"; no conflict with bold (Mod-B)
    'Mod-Shift-b': toggleBlockquote,
  }),

  getToolbarItems: (schema) => [
    {
      id: 'blockquote',
      iconHtml: svgBlockquote,
      tooltip: 'Quote (Ctrl+Shift+B)',
      command: (state, dispatch) => toggleBlockquote(state, dispatch),
      // Traverse all ancestors — correct for cursor inside <blockquote><p>…
      isActive: (state) => {
        const { $from } = state.selection;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type === schema.nodes.blockquote) return true;
        }
        return false;
      },
    },
  ],
});
