import { Plugin as ProseMirrorPlugin } from '@inkstream/pm/state';
import { PasteRule } from './plugins';

/**
 * Creates a ProseMirror plugin that applies the given paste rules after every
 * paste operation. Only the newly inserted content is processed — existing
 * document text is never re-matched.
 *
 * The inserted range is determined by mapping the pre-paste cursor position
 * forward through the paste transaction and reading the post-paste selection
 * end, which is where ProseMirror leaves the cursor after a paste.
 */
export function buildPastePlugin(rules: PasteRule[]): ProseMirrorPlugin {
  if (!rules.length) return new ProseMirrorPlugin({});

  return new ProseMirrorPlugin({
    appendTransaction(transactions, oldState, newState) {
      const pasteTransaction = transactions.find(
        tr => tr.getMeta('uiEvent') === 'paste' || tr.getMeta('paste'),
      );
      if (!pasteTransaction) return null;

      // Map old cursor position forward to find where inserted content begins.
      const insertStart = pasteTransaction.mapping.map(oldState.selection.from, -1);
      // ProseMirror places the cursor at the end of pasted content.
      const insertEnd = newState.selection.to;

      if (insertStart >= insertEnd) return null;

      const { tr } = newState;
      let changed = false;

      newState.doc.nodesBetween(insertStart, insertEnd, (node, pos) => {
        if (!node.isText || !node.text) return;

        // Clamp to the inserted portion of this text node.
        const nodeFrom = pos;
        const segFrom = Math.max(nodeFrom, insertStart) - nodeFrom;
        const segTo = Math.min(pos + node.nodeSize, insertEnd + 1) - nodeFrom;
        const segment = node.text.slice(segFrom, segTo);

        for (const rule of rules) {
          // Always use the 'g' flag so exec() advances through the string.
          const regex = new RegExp(
            rule.find.source,
            rule.find.flags.includes('g') ? rule.find.flags : rule.find.flags + 'g',
          );
          let match: RegExpExecArray | null;
          while ((match = regex.exec(segment)) !== null) {
            const from = nodeFrom + segFrom + match.index;
            const to = from + match[0].length;
            rule.handler({ state: newState, tr, match, from, to });
            changed = true;
          }
        }
      });

      return changed ? tr : null;
    },
  });
}
