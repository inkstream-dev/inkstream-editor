import { EditorState, Transaction } from '@inkstream/pm/state';

export type AlignValue = 'left' | 'center' | 'right' | 'justify';

/**
 * Returns a command that applies or toggles a text-alignment on every
 * block in the selection that declares an `align` attribute.
 *
 * Clicking the same alignment a second time resets to null (default left).
 * `null` and `'left'` are treated as equivalent so clicking left on an
 * already-left-aligned block is always a no-op.
 */
export const setAlignment = (align: AlignValue) => (
  state: EditorState,
  dispatch?: (tr: Transaction) => void
): boolean => {
  const { selection, doc, tr } = state;
  const { from, to } = selection;

  let changed = false;

  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isBlock) return;
    if (!node.type.spec.attrs || node.type.spec.attrs.align === undefined) return;

    // Treat null and 'left' as the same effective alignment
    const currentAlign: string | null = node.attrs.align;
    const effectiveCurrent = currentAlign || 'left';

    // Toggle: clicking the active alignment resets to null (= left)
    const newAlign = effectiveCurrent === align ? null : align;

    if (newAlign !== currentAlign) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, align: newAlign });
      changed = true;
    }
  });

  if (changed && dispatch) {
    dispatch(tr.scrollIntoView());
    return true;
  }

  return changed;
};

/**
 * Returns the dominant alignment of the current selection:
 * - If all alignable blocks share the same value → that value
 * - If mixed → null
 * - If no alignable blocks → null
 */
export const getActiveAlignment = (state: EditorState): AlignValue | null => {
  const { selection, doc } = state;
  const { from, to } = selection;

  let active: AlignValue | null | undefined = undefined;

  doc.nodesBetween(from, to, (node) => {
    if (!node.isBlock) return;
    if (!node.type.spec.attrs || node.type.spec.attrs.align === undefined) return;

    const value = (node.attrs.align as AlignValue | null) || 'left';
    if (active === undefined) {
      active = value;
    } else if (active !== value) {
      active = null; // mixed → neutral
      return false;
    }
  });

  return active === undefined ? null : active;
};
