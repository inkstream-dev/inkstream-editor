/**
 * Svelte store adapter for `@inkstream/editor-core`.
 *
 * This module exposes helpers that satisfy Svelte's **readable store contract**
 * (`{ subscribe(fn): () => void }`) without importing Svelte itself.
 * Drop these directly into a Svelte 4/5 project — no extra dependencies needed.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createEditor } from '@inkstream/editor-core';
 *   import { editorContentStore, editorStateStore } from '@inkstream/editor-core/adapters/svelte';
 *   import { paragraphPlugin } from '@inkstream/starter-kit';
 *   import { onMount, onDestroy } from 'svelte';
 *
 *   let editorEl: HTMLElement;
 *   let editor: ReturnType<typeof createEditor>;
 *
 *   // Reactive stores
 *   let content = editorContentStore(editor);
 *   let editorState = editorStateStore(editor);
 *
 *   onMount(() => {
 *     editor = createEditor({ element: editorEl, plugins: [paragraphPlugin] });
 *     content = editorContentStore(editor);
 *     editorState = editorStateStore(editor);
 *   });
 *
 *   onDestroy(() => editor?.destroy());
 * </script>
 *
 * <div bind:this={editorEl} />
 * <p>HTML: {$content}</p>
 * <p>Can undo: {$editorState?.canUndo}</p>
 * ```
 */

import type { InkstreamEditor } from '../editor/InkstreamEditor';
import type { EditorState } from '@inkstream/pm/state';

// ---------------------------------------------------------------------------
// Svelte store contract (no Svelte dependency required)
// ---------------------------------------------------------------------------

/**
 * A minimal Svelte-compatible readable store interface.
 *
 * Satisfies Svelte's built-in `Readable<T>` type, so the `$store` auto-
 * subscribe shorthand works in `.svelte` files without any type assertions.
 */
export interface SvelteReadable<T> {
  /**
   * Subscribe to value changes.
   * Called immediately with the current value, then on every update.
   * Returns an unsubscribe function.
   */
  subscribe(run: (value: T) => void, invalidate?: (value?: T) => void): () => void;
}

// ---------------------------------------------------------------------------
// Content store — tracks the serialised HTML document
// ---------------------------------------------------------------------------

/**
 * Creates a Svelte readable store that emits the editor's HTML content
 * whenever the document changes (debounced by `onChangeDebounceMs`).
 *
 * The store emits the current content immediately on subscribe, so the
 * initial render always shows the correct value.
 *
 * @example
 * ```ts
 * const content = editorContentStore(editor);
 * // In Svelte: <p>{$content}</p>
 * ```
 */
export function editorContentStore(editor: InkstreamEditor): SvelteReadable<string> {
  return {
    subscribe(run) {
      run(editor.getContent());
      editor.on('change', run);
      return () => editor.off('change', run);
    },
  };
}

// ---------------------------------------------------------------------------
// State store — tracks derived editor state for toolbar / UI
// ---------------------------------------------------------------------------

/**
 * A serialisable snapshot of editor state, safe to pass to Svelte reactive
 * statements without holding a reference to ProseMirror internals.
 */
export interface SerializableEditorState {
  /** Whether the editor has any content (i.e., more than an empty paragraph). */
  isEmpty: boolean;
  /** Whether a redo step is available. */
  canRedo: boolean;
  /** Whether an undo step is available. */
  canUndo: boolean;
  /** Whether the current selection has the **bold** mark active. */
  isBold: boolean;
  /** Whether the current selection has the **italic** mark active. */
  isItalic: boolean;
  /** The raw ProseMirror `EditorState`. Use for advanced toolbar logic. */
  raw: EditorState;
}

function deriveState(editor: InkstreamEditor, state: EditorState): SerializableEditorState {
  const { schema } = editor;
  const { selection, doc } = state;

  const isBold =
    schema.marks.strong
      ? state.storedMarks?.some(m => m.type === schema.marks.strong) ??
        selection.$from.marks().some(m => m.type === schema.marks.strong)
      : false;

  const isItalic =
    schema.marks.em
      ? state.storedMarks?.some(m => m.type === schema.marks.em) ??
        selection.$from.marks().some(m => m.type === schema.marks.em)
      : false;

  // Undo/redo availability — detected via ProseMirror history plugin metadata.
  // Works when `@inkstream/starter-kit` (or any history plugin) is registered.
  const { undoDepth, redoDepth } = getHistoryDepths(state);

  return {
    isEmpty: doc.textContent.trim() === '' && doc.childCount <= 1,
    canUndo: undoDepth > 0,
    canRedo: redoDepth > 0,
    isBold,
    isItalic,
    raw: state,
  };
}

/** Extract undo/redo depth from ProseMirror history plugin state (if available). */
function getHistoryDepths(state: EditorState): { undoDepth: number; redoDepth: number } {
  try {
    // ProseMirror history stores its state under a plugin key.
    // We iterate plugin states to find one with `undoDepth`/`redoDepth`.
    for (const plugin of state.plugins) {
      const pluginState = plugin.getState(state);
      if (
        pluginState &&
        typeof pluginState === 'object' &&
        'undoDepth' in pluginState &&
        'redoDepth' in pluginState
      ) {
        return {
          undoDepth: (pluginState as { undoDepth: number }).undoDepth,
          redoDepth: (pluginState as { redoDepth: number }).redoDepth,
        };
      }
    }
  } catch {
    // Ignore — history plugin may not be registered.
  }
  return { undoDepth: 0, redoDepth: 0 };
}

/**
 * Creates a Svelte readable store that emits a {@link SerializableEditorState}
 * snapshot on every transaction.
 *
 * Use this to drive toolbar buttons, word counts, or any state-dependent UI.
 *
 * @example
 * ```ts
 * const state = editorStateStore(editor);
 * // In Svelte:
 * // <button disabled={!$state.canUndo} on:click={() => editor.executeCommand('undo')}>Undo</button>
 * // <button class:active={$state.isBold} on:click={() => editor.executeCommand('toggleBold')}>B</button>
 * ```
 */
export function editorStateStore(editor: InkstreamEditor): SvelteReadable<SerializableEditorState | null> {
  return {
    subscribe(run) {
      const state = editor.getState();
      run(state ? deriveState(editor, state) : null);

      const listener = (newState: EditorState) => run(deriveState(editor, newState));
      editor.on('update', listener);
      return () => editor.off('update', listener);
    },
  };
}
