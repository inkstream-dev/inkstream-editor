import { createPlugin } from './plugins/plugin-factory';
import { EditorLifecycleContext, UpdateLifecycleContext, FocusLifecycleContext } from './plugins';
import { EditorView } from '@inkstream/pm/view';
import { EditorState, Transaction } from '@inkstream/pm/state';

describe('Lifecycle hooks in createPlugin', () => {
  it('exposes onCreate on the returned plugin when defined', () => {
    const mock = jest.fn();
    const plugin = createPlugin({ name: 'p', onCreate(ctx) { mock(ctx); } });
    expect(typeof plugin.onCreate).toBe('function');
    const ctx: EditorLifecycleContext = { view: {} as EditorView };
    plugin.onCreate!(ctx);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(ctx);
  });

  it('exposes onUpdate on the returned plugin when defined', () => {
    const mock = jest.fn();
    const plugin = createPlugin({ name: 'p', onUpdate(ctx) { mock(ctx); } });
    expect(typeof plugin.onUpdate).toBe('function');
    const ctx: UpdateLifecycleContext = {
      view: {} as EditorView,
      state: {} as EditorState,
      prevState: {} as EditorState,
      tr: {} as Transaction,
    };
    plugin.onUpdate!(ctx);
    expect(mock).toHaveBeenCalledWith(ctx);
  });

  it('exposes onDestroy on the returned plugin when defined', () => {
    const mock = jest.fn();
    const plugin = createPlugin({ name: 'p', onDestroy() { mock(); } });
    expect(typeof plugin.onDestroy).toBe('function');
    plugin.onDestroy!();
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('exposes onFocus on the returned plugin when defined', () => {
    const mock = jest.fn();
    const plugin = createPlugin({ name: 'p', onFocus(ctx) { mock(ctx); } });
    expect(typeof plugin.onFocus).toBe('function');
    const ctx: FocusLifecycleContext = { view: {} as EditorView, event: {} as Event };
    plugin.onFocus!(ctx);
    expect(mock).toHaveBeenCalledWith(ctx);
  });

  it('exposes onBlur on the returned plugin when defined', () => {
    const mock = jest.fn();
    const plugin = createPlugin({ name: 'p', onBlur(ctx) { mock(ctx); } });
    expect(typeof plugin.onBlur).toBe('function');
    const ctx: FocusLifecycleContext = { view: {} as EditorView, event: {} as Event };
    plugin.onBlur!(ctx);
    expect(mock).toHaveBeenCalledWith(ctx);
  });

  it('lifecycle hooks are undefined when not defined in config', () => {
    const plugin = createPlugin({ name: 'p' });
    expect(plugin.onCreate).toBeUndefined();
    expect(plugin.onUpdate).toBeUndefined();
    expect(plugin.onDestroy).toBeUndefined();
    expect(plugin.onFocus).toBeUndefined();
    expect(plugin.onBlur).toBeUndefined();
  });

  it('lifecycle hooks can access this.options', () => {
    interface Opts { multiplier: number }
    const results: number[] = [];
    const plugin = createPlugin<Opts>({
      name: 'p',
      addOptions: () => ({ multiplier: 7 }),
      onCreate() { results.push(this.options.multiplier); },
      onUpdate() { results.push(this.options.multiplier * 2); },
      onDestroy() { results.push(this.options.multiplier * 3); },
    });
    plugin.onCreate!({ view: {} as EditorView });
    plugin.onUpdate!({ view: {} as EditorView, state: {} as EditorState, prevState: {} as EditorState, tr: {} as Transaction });
    plugin.onDestroy!();
    expect(results).toEqual([7, 14, 21]);
  });

  it('each hook call creates a fresh context from makeContext so options are current', () => {
    const captured: unknown[] = [];
    const plugin = createPlugin({
      name: 'p',
      addOptions: () => ({ value: 'default' }),
      onCreate(ctx) { captured.push(this.options); },
    });
    plugin.onCreate!({ view: {} as EditorView });
    plugin.onCreate!({ view: {} as EditorView });
    expect(captured).toHaveLength(2);
    expect(captured[0]).toEqual({ value: 'default' });
    expect(captured[1]).toEqual({ value: 'default' });
  });
});
