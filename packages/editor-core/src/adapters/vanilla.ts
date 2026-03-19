/**
 * Vanilla JS adapter for `@inkstream/editor-core`.
 *
 * Pure TypeScript helpers for integrating the Inkstream editor into plain
 * JavaScript or TypeScript projects with zero framework overhead. These
 * utilities wrap the `InkstreamEditor` event system with ergonomic patterns
 * for DOM-based UIs.
 *
 * @example
 * ```ts
 * import { mountEditor } from '@inkstream/editor-core/adapters/vanilla';
 * import { paragraphPlugin, boldPlugin, italicPlugin } from '@inkstream/starter-kit';
 *
 * const { editor, destroy } = mountEditor({
 *   element: document.getElementById('editor')!,
 *   plugins: [paragraphPlugin, boldPlugin, italicPlugin],
 *   initialContent: '<p>Hello world!</p>',
 *   onReady: (view) => console.log('Editor ready', view),
 *   onChange: (html) => {
 *     document.getElementById('output')!.textContent = html;
 *   },
 * });
 *
 * // Toolbar wire-up
 * document.getElementById('bold-btn')!.addEventListener('click', () => {
 *   editor.executeCommand('toggleBold');
 * });
 *
 * // Reactive toolbar state
 * const unsub = bindToolbarState(editor, {
 *   onUpdate({ isBold, canUndo }) {
 *     boldBtn.classList.toggle('active', isBold);
 *     undoBtn.disabled = !canUndo;
 *   },
 * });
 *
 * // Tear down
 * destroy();
 * unsub();
 * ```
 */

import type { InkstreamEditorConfig } from '../editor/InkstreamEditor';
import type { InkstreamEditor } from '../editor/InkstreamEditor';
import type { EditorState } from '@inkstream/pm/state';

// ---------------------------------------------------------------------------
// Toolbar state snapshot
// ---------------------------------------------------------------------------

/** Serialisable editor state snapshot safe to use in plain DOM callbacks. */
export interface VanillaEditorState {
  /** Current document serialised as HTML. */
  html: string;
  /** Whether the bold mark is active at the cursor. */
  isBold: boolean;
  /** Whether the italic mark is active at the cursor. */
  isItalic: boolean;
  /** Whether an undo step is available. */
  canUndo: boolean;
  /** Whether a redo step is available. */
  canRedo: boolean;
  /** Whether the document is empty (only an empty paragraph). */
  isEmpty: boolean;
}

function deriveVanillaState(editor: InkstreamEditor, state: EditorState): VanillaEditorState {
  const { schema } = editor;
  const { selection } = state;

  const hasStoredMark = (type: unknown) =>
    state.storedMarks?.some(m => m.type === type) ?? false;
  const hasCursorMark = (type: unknown) =>
    selection.$from.marks().some(m => m.type === type);

  const isBold = schema.marks.strong
    ? hasStoredMark(schema.marks.strong) || hasCursorMark(schema.marks.strong)
    : false;

  const isItalic = schema.marks.em
    ? hasStoredMark(schema.marks.em) || hasCursorMark(schema.marks.em)
    : false;

  const { undoDepth, redoDepth } = getHistoryDepths(state);

  return {
    html: editor.getContent(),
    isBold,
    isItalic,
    canUndo: undoDepth > 0,
    canRedo: redoDepth > 0,
    isEmpty: state.doc.textContent.trim() === '' && state.doc.childCount <= 1,
  };
}

function getHistoryDepths(state: EditorState): { undoDepth: number; redoDepth: number } {
  try {
    for (const plugin of state.plugins) {
      const s = plugin.getState(state);
      if (s && typeof s === 'object' && 'undoDepth' in (s as object)) {
        return {
          undoDepth: (s as { undoDepth: number }).undoDepth,
          redoDepth: (s as { redoDepth: number }).redoDepth,
        };
      }
    }
  } catch { /* history not registered */ }
  return { undoDepth: 0, redoDepth: 0 };
}

// ---------------------------------------------------------------------------
// mountEditor — primary entry point
// ---------------------------------------------------------------------------

/** Return value of `mountEditor()`. */
export interface MountedEditor {
  /** The underlying `InkstreamEditor` instance. */
  editor: InkstreamEditor;
  /**
   * Destroy the editor and clean up all internal subscriptions.
   * After calling this, the `editor` reference should be discarded.
   */
  destroy(): void;
}

/**
 * Mount an Inkstream editor into a DOM element, returning the editor instance
 * and a `destroy()` cleanup function.
 *
 * This is the recommended entry point for Vanilla JS integrations. It is
 * equivalent to `new InkstreamEditor(config)` / `createEditor(config)` but
 * packages the destroy step ergonomically.
 *
 * @example
 * ```ts
 * const { editor, destroy } = mountEditor({
 *   element: document.querySelector('#editor')!,
 *   plugins: allPlugins,
 *   onChange: html => output.textContent = html,
 * });
 *
 * // Wire up toolbar buttons
 * boldBtn.onclick = () => editor.executeCommand('toggleBold');
 *
 * // Clean up on page unload
 * window.addEventListener('beforeunload', destroy);
 * ```
 */
export function mountEditor(config: InkstreamEditorConfig): MountedEditor {
  const { createEditor } = require('../index') as { createEditor: (c: InkstreamEditorConfig) => InkstreamEditor };
  const editor = createEditor(config);
  return {
    editor,
    destroy: () => editor.destroy(),
  };
}

// ---------------------------------------------------------------------------
// bindToolbarState — reactive toolbar wiring
// ---------------------------------------------------------------------------

/** Options for `bindToolbarState()`. */
export interface BindToolbarStateOptions {
  /**
   * Called immediately with the initial state, then on every editor
   * transaction. Use this to update button active/disabled states.
   */
  onUpdate(state: VanillaEditorState): void;
}

/**
 * Subscribe to editor state changes and invoke `onUpdate` with a
 * {@link VanillaEditorState} snapshot on every transaction.
 *
 * Returns an unsubscribe function — call it to stop receiving updates.
 *
 * @example
 * ```ts
 * const unsub = bindToolbarState(editor, {
 *   onUpdate({ isBold, canUndo }) {
 *     boldBtn.classList.toggle('active', isBold);
 *     undoBtn.disabled = !canUndo;
 *   },
 * });
 *
 * // Later, when tearing down:
 * unsub();
 * ```
 */
export function bindToolbarState(
  editor: InkstreamEditor,
  options: BindToolbarStateOptions,
): () => void {
  const { onUpdate } = options;

  // Fire immediately with the current state.
  const currentState = editor.getState();
  if (currentState) onUpdate(deriveVanillaState(editor, currentState));

  const listener = (state: EditorState) => onUpdate(deriveVanillaState(editor, state));
  editor.on('update', listener);
  return () => editor.off('update', listener);
}

// ---------------------------------------------------------------------------
// onContentChange — simple content-change subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to document content changes, receiving the serialised HTML string
 * whenever the document is edited (debounced by `onChangeDebounceMs`).
 *
 * Returns an unsubscribe function.
 *
 * @example
 * ```ts
 * const unsub = onContentChange(editor, html => {
 *   localStorage.setItem('draft', html);
 * });
 * ```
 */
export function onContentChange(
  editor: InkstreamEditor,
  callback: (html: string) => void,
): () => void {
  editor.on('change', callback);
  return () => editor.off('change', callback);
}

// ---------------------------------------------------------------------------
// onSelectionChange — selection-only updates
// ---------------------------------------------------------------------------

/**
 * Subscribe to selection changes (cursor moves, range selections) without
 * firing on every document edit. Useful for context menus or link-bubble UIs
 * that only need to react when the selection moves.
 *
 * Returns an unsubscribe function.
 *
 * @example
 * ```ts
 * const unsub = onSelectionChange(editor, state => {
 *   const { from, to } = state.selection;
 *   linkBubble.style.display = from !== to ? 'block' : 'none';
 * });
 * ```
 */
export function onSelectionChange(
  editor: InkstreamEditor,
  callback: (state: EditorState) => void,
): () => void {
  editor.on('selectionUpdate', callback);
  return () => editor.off('selectionUpdate', callback);
}
