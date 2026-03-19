import type { EditorState } from '@inkstream/pm/state';

type Subscriber = () => void;
type Unsubscribe = () => void;

/**
 * Lightweight pub/sub store that bridges ProseMirror transactions to any
 * reactive framework.
 *
 * One instance is created per `InkstreamEditor` lifetime. Call `update()` on
 * every transaction; framework adapters subscribe via `subscribe()` to trigger
 * their own re-render mechanism:
 *
 * - **React**: pass this store to `useEditorState()` which wraps it in
 *   `useSyncExternalStore` for concurrent-safe subscriptions.
 * - **Vue**: read `getSnapshot()` inside a `watchEffect` to track changes.
 * - **Svelte**: use a simple `subscribe`-based writable store adapter.
 * - **Vanilla JS**: subscribe directly and update the DOM in the callback.
 *
 * @example
 * ```ts
 * // Vanilla JS usage
 * const editor = new InkstreamEditor({ element, plugins });
 * editor.store.subscribe(() => {
 *   const state = editor.store.getSnapshot();
 *   if (state) renderToolbar(state);
 * });
 * ```
 */
export class EditorStateStore {
  private _state: EditorState | null = null;
  private _subscribers = new Set<Subscriber>();

  /** Called by InkstreamEditor on every ProseMirror transaction. */
  update(state: EditorState): void {
    this._state = state;
    this._subscribers.forEach(fn => fn());
  }

  /**
   * Subscribe to state changes. Returns an unsubscribe function.
   *
   * Compatible with React 18's `useSyncExternalStore` `subscribe` parameter.
   */
  subscribe(callback: Subscriber): Unsubscribe {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * Returns the current editor state snapshot, or `null` before the first
   * transaction.
   *
   * Compatible with React 18's `useSyncExternalStore` `getSnapshot` parameter.
   */
  getSnapshot(): EditorState | null {
    return this._state;
  }

  /** Number of active subscribers. Useful for testing and diagnostics. */
  get subscriberCount(): number {
    return this._subscribers.size;
  }
}
