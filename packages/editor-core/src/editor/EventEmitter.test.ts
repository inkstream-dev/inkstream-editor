import { EventEmitter } from './EventEmitter';

interface TestEvents {
  greet: string;
  count: number;
  destroy: void;
}

/** Subclass that exposes `emit` publicly so unit tests can trigger events. */
class TestEmitter extends EventEmitter<TestEvents> {
  override emit<K extends keyof TestEvents>(
    event: K,
    ...args: TestEvents[K] extends void ? [] : [TestEvents[K]]
  ): void {
    super.emit(event, ...args);
  }
}

describe('EventEmitter', () => {
  let emitter: TestEmitter;

  beforeEach(() => {
    emitter = new TestEmitter();
  });

  // ---------------------------------------------------------------------------
  // on / emit
  // ---------------------------------------------------------------------------

  it('calls a registered listener when the event is emitted', () => {
    const fn = jest.fn();
    emitter.on('greet', fn);
    emitter.emit('greet', 'hello');
    expect(fn).toHaveBeenCalledWith('hello');
  });

  it('calls multiple listeners for the same event in registration order', () => {
    const order: number[] = [];
    emitter.on('greet', () => order.push(1));
    emitter.on('greet', () => order.push(2));
    emitter.on('greet', () => order.push(3));
    emitter.emit('greet', 'x');
    expect(order).toEqual([1, 2, 3]);
  });

  it('passes the payload to the listener', () => {
    const received: number[] = [];
    emitter.on('count', n => received.push(n));
    emitter.emit('count', 42);
    emitter.emit('count', 7);
    expect(received).toEqual([42, 7]);
  });

  it('emits void events with no arguments', () => {
    const fn = jest.fn();
    emitter.on('destroy', fn);
    emitter.emit('destroy');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith();
  });

  it('does not call listeners for other events', () => {
    const fn = jest.fn();
    emitter.on('count', fn);
    emitter.emit('greet', 'hi');
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not throw when emitting an event with no listeners', () => {
    expect(() => emitter.emit('greet', 'silent')).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // off
  // ---------------------------------------------------------------------------

  it('removes a specific listener after off()', () => {
    const fn = jest.fn();
    emitter.on('greet', fn);
    emitter.off('greet', fn);
    emitter.emit('greet', 'ignored');
    expect(fn).not.toHaveBeenCalled();
  });

  it('only removes the specified listener, leaving others in place', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    emitter.on('greet', fn1);
    emitter.on('greet', fn2);
    emitter.off('greet', fn1);
    emitter.emit('greet', 'hi');
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledWith('hi');
  });

  it('is a no-op when removing a listener that was never registered', () => {
    expect(() => emitter.off('greet', jest.fn())).not.toThrow();
  });

  it('adding the same listener twice registers it only once (Set semantics)', () => {
    const fn = jest.fn();
    emitter.on('greet', fn);
    emitter.on('greet', fn);
    emitter.emit('greet', 'x');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // on() returns this (fluent chaining)
  // ---------------------------------------------------------------------------

  it('on() returns this for fluent chaining', () => {
    const fn = jest.fn();
    const result = emitter.on('greet', fn);
    expect(result).toBe(emitter);
  });

  it('off() returns this for fluent chaining', () => {
    const fn = jest.fn();
    emitter.on('greet', fn);
    const result = emitter.off('greet', fn);
    expect(result).toBe(emitter);
  });

  // ---------------------------------------------------------------------------
  // removeAllListeners
  // ---------------------------------------------------------------------------

  it('removeAllListeners(event) removes all listeners for that event only', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    const fn3 = jest.fn();
    emitter.on('greet', fn1);
    emitter.on('greet', fn2);
    emitter.on('count', fn3);

    emitter.removeAllListeners('greet');

    emitter.emit('greet', 'gone');
    emitter.emit('count', 1);

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
    expect(fn3).toHaveBeenCalledTimes(1);
  });

  it('removeAllListeners() with no argument removes listeners for all events', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    emitter.on('greet', fn1);
    emitter.on('count', fn2);

    emitter.removeAllListeners();

    emitter.emit('greet', 'x');
    emitter.emit('count', 1);

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // listenerCount
  // ---------------------------------------------------------------------------

  it('listenerCount returns 0 for events with no listeners', () => {
    expect(emitter.listenerCount('greet')).toBe(0);
  });

  it('listenerCount reflects the current number of listeners', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    emitter.on('greet', fn1);
    expect(emitter.listenerCount('greet')).toBe(1);
    emitter.on('greet', fn2);
    expect(emitter.listenerCount('greet')).toBe(2);
    emitter.off('greet', fn1);
    expect(emitter.listenerCount('greet')).toBe(1);
  });
});
