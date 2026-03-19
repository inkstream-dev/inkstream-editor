/**
 * Lightweight, typed event emitter used by `InkstreamEditor`.
 *
 * `TEventMap` maps event names to their payload types.
 * Use `void` for events that carry no payload.
 *
 * @example
 * ```ts
 * interface MyEvents {
 *   change: string;   // payload is a string
 *   destroy: void;    // no payload
 * }
 * class MyClass extends EventEmitter<MyEvents> { ... }
 * const obj = new MyClass();
 * obj.on('change', html => console.log(html));
 * obj.on('destroy', () => console.log('destroyed'));
 * obj.emit('change', '<p>hi</p>');
 * obj.emit('destroy');
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class EventEmitter<TEventMap extends Record<string, any>> {
  private readonly _listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  /**
   * Subscribe to an event. Returns `this` for fluent chaining.
   *
   * Multiple listeners for the same event are called in registration order.
   * Adding the same listener reference twice is a no-op (Set semantics).
   */
  on<K extends keyof TEventMap>(
    event: K,
    listener: TEventMap[K] extends void ? () => void : (payload: TEventMap[K]) => void,
  ): this {
    const key = event as string;
    if (!this._listeners.has(key)) this._listeners.set(key, new Set());
    this._listeners.get(key)!.add(listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Remove a previously registered listener. No-op if the listener was never
   * registered. Returns `this` for fluent chaining.
   */
  off<K extends keyof TEventMap>(
    event: K,
    listener: TEventMap[K] extends void ? () => void : (payload: TEventMap[K]) => void,
  ): this {
    this._listeners.get(event as string)?.delete(listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Emit an event, calling all registered listeners synchronously.
   *
   * For `void`-payload events, call as `emit('destroy')`.
   * For typed-payload events, call as `emit('change', html)`.
   *
   * @internal — Called by `InkstreamEditor` only. Consumers use `on`/`off`.
   */
  protected emit<K extends keyof TEventMap>(
    event: K,
    ...args: TEventMap[K] extends void ? [] : [TEventMap[K]]
  ): void {
    this._listeners.get(event as string)?.forEach(fn => fn(...(args as unknown[])));
  }

  /**
   * Remove all listeners for a specific event, or all listeners for all
   * events when called without an argument.
   */
  removeAllListeners(event?: keyof TEventMap): void {
    if (event !== undefined) {
      this._listeners.delete(event as string);
    } else {
      this._listeners.clear();
    }
  }

  /** Number of listeners registered for a given event. Useful for testing. */
  listenerCount(event: keyof TEventMap): number {
    return this._listeners.get(event as string)?.size ?? 0;
  }
}
