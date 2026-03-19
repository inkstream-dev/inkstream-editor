import { renderHook, act } from '@testing-library/react';
import { useEditorState, EditorStateStore } from './useEditorState';
import type { EditorState } from '@inkstream/pm/state';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore(initialState?: Partial<EditorState>): EditorStateStore {
  const store = new EditorStateStore();
  if (initialState) {
    store.update(initialState as EditorState);
  }
  return store;
}

const fakeState = (data: Record<string, unknown> = {}): EditorState =>
  ({ doc: { type: 'doc' }, selection: {}, ...data } as unknown as EditorState);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useEditorState', () => {
  it('returns null when store is null', () => {
    const { result } = renderHook(() =>
      useEditorState(null, (s) => s.doc)
    );
    expect(result.current).toBeNull();
  });

  it('returns null when store has no snapshot yet', () => {
    const store = new EditorStateStore();
    const { result } = renderHook(() =>
      useEditorState(store, (s) => s.doc)
    );
    expect(result.current).toBeNull();
  });

  it('returns the selector result from the current store snapshot', () => {
    const state = fakeState({ selection: { from: 5 } });
    const store = makeStore(state);
    const { result } = renderHook(() =>
      useEditorState(store, (s) => (s.selection as unknown as { from: number }).from)
    );
    expect(result.current).toBe(5);
  });

  it('re-renders when the store emits an update that changes the selected value', () => {
    const store = makeStore(fakeState({ selection: { from: 1 } }));
    const { result } = renderHook(() =>
      useEditorState(store, (s) => (s.selection as unknown as { from: number }).from)
    );

    act(() => {
      store.update(fakeState({ selection: { from: 42 } }));
    });

    expect(result.current).toBe(42);
  });

  it('does NOT re-render when the selected value is unchanged (Object.is stable)', () => {
    const store = makeStore(fakeState({ selection: { from: 7 } }));
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useEditorState(store, () => 'constant');
    });

    const countBefore = renderCount;
    act(() => {
      store.update(fakeState({ selection: { from: 99 } }));
    });

    expect(result.current).toBe('constant');
    // renderCount should not have increased (no re-render triggered)
    expect(renderCount).toBe(countBefore);
  });

  it('multiple subscribers receive updates independently', () => {
    const store = makeStore(fakeState({ selection: { from: 0 } }));
    const { result: r1 } = renderHook(() =>
      useEditorState(store, (s) => (s.selection as unknown as { from: number }).from)
    );
    const { result: r2 } = renderHook(() =>
      useEditorState(store, (s) => (s.selection as unknown as { from: number }).from)
    );

    act(() => {
      store.update(fakeState({ selection: { from: 100 } }));
    });

    expect(r1.current).toBe(100);
    expect(r2.current).toBe(100);
  });

  it('returns null after store is swapped to null', () => {
    const store = makeStore(fakeState({ selection: { from: 3 } }));
    const { result, rerender } = renderHook(
      ({ s }: { s: EditorStateStore | null }) =>
        useEditorState(s, (st) => (st.selection as unknown as { from: number }).from),
      { initialProps: { s: store as EditorStateStore | null } }
    );

    expect(result.current).toBe(3);

    rerender({ s: null });

    expect(result.current).toBeNull();
  });
});
