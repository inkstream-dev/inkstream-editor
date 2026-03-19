import type { EditorState } from '@inkstream/pm/state';
import type { EditorView } from '@inkstream/pm/view';

/**
 * Typed payload map for all events emitted by `InkstreamEditor`.
 *
 * Pass this to `editor.on()` / `editor.off()` for full type safety:
 *
 * ```ts
 * editor.on('change', (html: string) => { ... });
 * editor.on('update', (state: EditorState) => { ... });
 * editor.on('destroy', () => { ... });
 * ```
 *
 * Framework adapters use these events to build reactive bridges without
 * depending on React, Vue, or Svelte.
 */
export interface EditorEventMap {
  /**
   * Fires on **every** ProseMirror transaction, regardless of whether
   * the document content or only the selection changed.
   *
   * Use this event to update toolbar state, word-count indicators, or
   * any UI that depends on the live `EditorState`.
   *
   * Payload: the new `EditorState` after the transaction was applied.
   */
  update: EditorState;

  /**
   * Fires (debounced by `onChangeDebounceMs`, default 300 ms) whenever the
   * **document content** changes. Equivalent to the `onChange` constructor
   * option but accessible via the event system.
   *
   * Payload: the full document serialised as an HTML string.
   */
  change: string;

  /**
   * Fires when the **selection** changes without a document change
   * (e.g., cursor moved by arrow keys or mouse click on existing text).
   *
   * Payload: the new `EditorState`.
   */
  selectionUpdate: EditorState;

  /**
   * Fires when the editor gains browser focus.
   *
   * Payload: the raw DOM `FocusEvent`.
   */
  focus: Event;

  /**
   * Fires when the editor loses browser focus.
   *
   * Payload: the raw DOM `FocusEvent`.
   */
  blur: Event;

  /**
   * Fires **once** after the `EditorView` is created and all plugin
   * `onCreate` lifecycle hooks have run.
   *
   * Payload: the live `EditorView` instance.
   */
  ready: EditorView;

  /**
   * Fires when `destroy()` is called, **before** the `EditorView` is
   * torn down. Use this to clean up any subscriptions or derived state.
   *
   * No payload.
   */
  destroy: void;
}
