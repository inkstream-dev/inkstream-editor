import { EditorStateStore } from './EditorStateStore';
import type { EditorState } from '@inkstream/pm/state';

// Minimal stub — the store only reads from EditorState, never mutates it.
function fakeState(id: string): EditorState {
  return { _id: id } as unknown as EditorState;
}

describe('EditorStateStore', () => {
  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  it('getSnapshot() returns null before any update', () => {
    const store = new EditorStateStore();
    expect(store.getSnapshot()).toBeNull();
  });

  it('subscriberCount starts at 0', () => {
    const store = new EditorStateStore();
    expect(store.subscriberCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // update()
  // ---------------------------------------------------------------------------

  it('update() stores the state and getSnapshot() returns it', () => {
    const store = new EditorStateStore();
    const state = fakeState('a');
    store.update(state);
    expect(store.getSnapshot()).toBe(state);
  });

  it('update() replaces the previous state', () => {
    const store = new EditorStateStore();
    store.update(fakeState('a'));
    const stateB = fakeState('b');
    store.update(stateB);
    expect(store.getSnapshot()).toBe(stateB);
  });

  // ---------------------------------------------------------------------------
  // subscribe() / unsubscribe
  // ---------------------------------------------------------------------------

  it('subscribe() notifies the subscriber on update', () => {
    const store = new EditorStateStore();
    const cb = jest.fn();
    store.subscribe(cb);
    store.update(fakeState('a'));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('subscribe() returns an unsubscribe function', () => {
    const store = new EditorStateStore();
    const cb = jest.fn();
    const unsub = store.subscribe(cb);
    unsub();
    store.update(fakeState('a'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('multiple subscribers are all notified', () => {
    const store = new EditorStateStore();
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    store.subscribe(cb1);
    store.subscribe(cb2);
    store.update(fakeState('a'));
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing one does not affect others', () => {
    const store = new EditorStateStore();
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const unsub1 = store.subscribe(cb1);
    store.subscribe(cb2);
    unsub1();
    store.update(fakeState('a'));
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('subscriberCount reflects active subscribers', () => {
    const store = new EditorStateStore();
    const unsub1 = store.subscribe(jest.fn());
    const unsub2 = store.subscribe(jest.fn());
    expect(store.subscriberCount).toBe(2);
    unsub1();
    expect(store.subscriberCount).toBe(1);
    unsub2();
    expect(store.subscriberCount).toBe(0);
  });

  it('subscriber receives correct state via getSnapshot()', () => {
    const store = new EditorStateStore();
    const stateA = fakeState('a');
    const snapshots: (EditorState | null)[] = [];
    store.subscribe(() => snapshots.push(store.getSnapshot()));
    store.update(stateA);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toBe(stateA);
  });

  it('calling update multiple times notifies subscriber each time', () => {
    const store = new EditorStateStore();
    const cb = jest.fn();
    store.subscribe(cb);
    store.update(fakeState('a'));
    store.update(fakeState('b'));
    store.update(fakeState('c'));
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('double-calling the same unsubscribe function is a no-op', () => {
    const store = new EditorStateStore();
    const cb = jest.fn();
    const unsub = store.subscribe(cb);
    unsub();
    expect(() => unsub()).not.toThrow();
    store.update(fakeState('a'));
    expect(cb).not.toHaveBeenCalled();
  });
});
