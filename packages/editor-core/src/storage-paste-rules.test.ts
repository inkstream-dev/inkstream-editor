import { createPlugin } from './plugins/plugin-factory';
import { PasteRule, PluginManager } from './plugins';
import { buildPastePlugin } from './paste-rules';
import { getTestSchema } from './test-utils';
import { EditorView } from '@inkstream/pm/view';
import { EditorState, Transaction } from '@inkstream/pm/state';

// ---------------------------------------------------------------------------
// addStorage
// ---------------------------------------------------------------------------

describe('addStorage', () => {
  it('initialises storage from addStorage()', () => {
    const plugin = createPlugin({ name: 'p', addStorage: () => ({ count: 0 }) });
    expect(plugin.storage).toEqual({ count: 0 });
  });

  it('defaults storage to empty object when addStorage is not defined', () => {
    const plugin = createPlugin({ name: 'p' });
    expect(plugin.storage).toEqual({});
  });

  it('storage is accessible via this.storage in lifecycle hooks', () => {
    const results: number[] = [];
    const plugin = createPlugin({
      name: 'p',
      addStorage: () => ({ value: 7 }),
      onCreate() { results.push(this.storage.value); },
      onDestroy() { results.push(this.storage.value * 2); },
    });
    plugin.onCreate!({ view: {} as EditorView });
    plugin.onDestroy!();
    expect(results).toEqual([7, 14]);
  });

  it('storage is accessible via this.storage in getToolbarItems', () => {
    interface Storage { label: string }
    const plugin = createPlugin<Record<string, unknown>, Storage>({
      name: 'p',
      addStorage: () => ({ label: 'hello' }),
      getToolbarItems(schema) {
        return [{ id: 'item', tooltip: this.storage.label, command: () => false }];
      },
    });
    const schema = getTestSchema();
    const items = plugin.getToolbarItems!(schema);
    expect(items[0].tooltip).toBe('hello');
  });

  it('mutations to storage persist across calls', () => {
    const plugin = createPlugin({
      name: 'p',
      addStorage: () => ({ count: 0 }),
      onCreate() { this.storage.count = 42; },
    });
    plugin.onCreate!({ view: {} as EditorView });
    expect((plugin.storage as { count: number }).count).toBe(42);
  });

  it('storage is independent between separate createPlugin calls', () => {
    const make = () => createPlugin({ name: 'p', addStorage: () => ({ n: 0 }) });
    const p1 = make();
    const p2 = make();
    (p1.storage as any).n = 99;
    expect((p2.storage as any).n).toBe(0);
  });

  it('this.storage in onUpdate has access to the same mutable object', () => {
    const plugin = createPlugin({
      name: 'p',
      addStorage: () => ({ calls: 0 }),
      onUpdate() { this.storage.calls += 1; },
    });
    const ctx = { view: {} as EditorView, state: {} as EditorState, prevState: {} as EditorState, tr: {} as Transaction };
    plugin.onUpdate!(ctx);
    plugin.onUpdate!(ctx);
    expect((plugin.storage as { calls: number }).calls).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getPasteRules
// ---------------------------------------------------------------------------

describe('getPasteRules', () => {
  it('exposes getPasteRules on the returned plugin when defined', () => {
    const rule: PasteRule = { find: /foo/, handler: jest.fn() };
    const plugin = createPlugin({ name: 'p', getPasteRules: () => [rule] });
    expect(typeof plugin.getPasteRules).toBe('function');
    const schema = getTestSchema();
    const rules = plugin.getPasteRules!(schema);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toBe(rule);
  });

  it('getPasteRules is undefined when not defined in config', () => {
    const plugin = createPlugin({ name: 'p' });
    expect(plugin.getPasteRules).toBeUndefined();
  });

  it('getPasteRules can access this.options', () => {
    interface Opts { pattern: string }
    const plugin = createPlugin<Opts>({
      name: 'p',
      addOptions: () => ({ pattern: 'mypattern' }),
      getPasteRules(schema) {
        return [{ find: new RegExp(this.options.pattern), handler: jest.fn() }];
      },
    });
    const rules = plugin.getPasteRules!(getTestSchema());
    expect(rules[0].find.source).toBe('mypattern');
  });

  it('getPasteRules can access this.storage', () => {
    interface Storage { extra: string }
    const plugin = createPlugin<Record<string, unknown>, Storage>({
      name: 'p',
      addStorage: () => ({ extra: 'stored' }),
      getPasteRules(schema) {
        return [{ find: new RegExp(this.storage.extra), handler: jest.fn() }];
      },
    });
    const rules = plugin.getPasteRules!(getTestSchema());
    expect(rules[0].find.source).toBe('stored');
  });

  it('PluginManager.getPasteRules collects rules from all plugins', () => {
    const rule1: PasteRule = { find: /foo/, handler: jest.fn() };
    const rule2: PasteRule = { find: /bar/, handler: jest.fn() };
    const p1 = createPlugin({ name: 'p1', getPasteRules: () => [rule1] });
    const p2 = createPlugin({ name: 'p2', getPasteRules: () => [rule2] });
    const p3 = createPlugin({ name: 'p3' }); // no paste rules

    const manager = new PluginManager();
    manager.registerPlugin(p1);
    manager.registerPlugin(p2);
    manager.registerPlugin(p3);

    const rules = manager.getPasteRules(getTestSchema());
    expect(rules).toEqual([rule1, rule2]);
  });
});

// ---------------------------------------------------------------------------
// buildPastePlugin
// ---------------------------------------------------------------------------

describe('buildPastePlugin', () => {
  it('returns a ProseMirror Plugin when given no rules', () => {
    const plugin = buildPastePlugin([]);
    expect(plugin).toBeDefined();
    expect(typeof plugin.spec).toBe('object');
  });

  it('returns a ProseMirror Plugin when given rules', () => {
    const plugin = buildPastePlugin([{ find: /foo/, handler: jest.fn() }]);
    expect(plugin).toBeDefined();
  });

  it('plugin has an appendTransaction spec', () => {
    const plugin = buildPastePlugin([{ find: /foo/, handler: jest.fn() }]);
    expect(typeof (plugin.spec as any).appendTransaction).toBe('function');
  });

  it('appendTransaction returns null when no paste meta is present', () => {
    const handler = jest.fn();
    const plugin = buildPastePlugin([{ find: /foo/, handler }]);
    const schema = getTestSchema();
    const state = EditorState.create({ schema });
    // A non-paste transaction should not trigger the handler
    const tr = state.tr.insertText('foo bar');
    const result = (plugin.spec as any).appendTransaction([tr], state, state.apply(tr));
    expect(result).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });
});
