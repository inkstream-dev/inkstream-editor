import { useCallback, useLayoutEffect, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import type { EditorState } from '@inkstream/pm/state';

type Subscriber = () => void;
type Unsubscribe = () => void;

/**
 * Lightweight pub/sub store that bridges ProseMirror transactions to React.
 *
 * One instance is created per EditorView lifecycle. Call `update()` on every
 * transaction; React components subscribe via `useEditorState()`.
 *
 * This is the architectural equivalent of @tiptap/react's useSyncExternalStore
 * integration — it decouples ProseMirror state from React's render cycle so
 * that only components whose selected value actually changed will re-render.
 */
export class EditorStateStore {
  private _state: EditorState | null = null;
  private _subscribers = new Set<Subscriber>();

  /** Called by handleDispatchTransaction on every ProseMirror transaction. */
  update(state: EditorState): void {
    this._state = state;
    this._subscribers.forEach(fn => fn());
  }

  subscribe(callback: Subscriber): Unsubscribe {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  getSnapshot(): EditorState | null {
    return this._state;
  }
}

/**
 * Subscribe to a derived slice of ProseMirror editor state.
 *
 * Uses React 18's `useSyncExternalStore` so it is concurrent-safe and
 * SSR-compatible (server snapshot returns null). The component re-renders
 * only when the selected value changes (`Object.is` comparison), making it
 * ideal for boolean selectors like `isActive` / `isEnabled`.
 *
 * @param store    The EditorStateStore for the current editor instance.
 * @param selector A function that derives a value from EditorState.
 * @returns The selected value, or null when the editor is not yet mounted.
 *
 * @example
 * // Bold button — only re-renders when bold state changes
 * const isActive = useEditorState(store, s => isMarkActive(s, schema.marks.strong));
 */
export function useEditorState<T>(
  store: EditorStateStore | null,
  selector: (state: EditorState) => T
): T | null {
  // Store selector in a ref so subscribe/getSnapshot stay stable even when
  // the caller passes a new function reference on each render.
  const selectorRef = useRef(selector);
  useLayoutEffect(() => { selectorRef.current = selector; });

  const subscribe = useCallback(
    (callback: Subscriber): Unsubscribe =>
      store ? store.subscribe(callback) : () => {},
    [store]
  );

  const getSnapshot = useCallback(
    (): T | null => {
      const state = store?.getSnapshot() ?? null;
      return state ? selectorRef.current(state) : null;
    },
    [store]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
