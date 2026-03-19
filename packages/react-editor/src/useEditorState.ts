import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import type { EditorState } from '@inkstream/pm/state';
import { EditorStateStore } from '@inkstream/editor-core';

export { EditorStateStore };

// useLayoutEffect is not safe in SSR (throws a React warning about effects not
// encoding into the server renderer's output). Use a no-op on the server.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type Subscriber = () => void;
type Unsubscribe = () => void;

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
  useIsomorphicLayoutEffect(() => { selectorRef.current = selector; });

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
