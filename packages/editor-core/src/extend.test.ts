import { createPlugin, ExtendablePlugin } from './plugins/plugin-factory';
import { PluginManager } from './plugins/index';
import { Schema } from '@inkstream/pm/model';

// Minimal schema used by tests that call schema-dependent methods.
function makeSchema() {
  return new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { group: 'block', content: 'inline*' },
      text: { group: 'inline' },
    },
    marks: {
      strong: {},
      em: {},
    },
  });
}

describe('ExtendablePlugin — extend()', () => {
  // ---------------------------------------------------------------------------
  // Name
  // ---------------------------------------------------------------------------
  it('inherits parent name when name is not provided in overrides', () => {
    const parent = createPlugin({ name: 'my-plugin' });
    const child = parent.extend({});
    expect(child.name).toBe('my-plugin');
  });

  it('uses the overridden name when provided', () => {
    const parent = createPlugin({ name: 'bold' });
    const child = parent.extend({ name: 'custom-bold' });
    expect(child.name).toBe('custom-bold');
  });

  // ---------------------------------------------------------------------------
  // Tier
  // ---------------------------------------------------------------------------
  it('inherits tier from parent', () => {
    const parent = createPlugin({ name: 'parent', tier: 'pro' });
    const child = parent.extend({ name: 'child' });
    expect(child.tier).toBe('pro');
  });

  it('overrides tier when provided', () => {
    const parent = createPlugin({ name: 'parent', tier: 'free' });
    const child = parent.extend({ name: 'child', tier: 'premium' });
    expect(child.tier).toBe('premium');
  });

  // ---------------------------------------------------------------------------
  // Nodes / marks
  // ---------------------------------------------------------------------------
  it('inherits marks from parent when not overridden', () => {
    const markSpec = { toDOM() { return ['strong', 0]; } };
    const parent = createPlugin({ name: 'parent', marks: { strong: markSpec } });
    const child = parent.extend({ name: 'child' });
    expect(child.marks).toBeDefined();
    expect(child.marks!.strong).toBe(markSpec);
  });

  it('replaces marks entirely when child provides marks', () => {
    const parentMark = { toDOM() { return ['strong', 0]; } };
    const childMark  = { toDOM() { return ['b', 0]; } };
    const parent = createPlugin({ name: 'parent', marks: { strong: parentMark } });
    const child  = parent.extend({ name: 'child', marks: { em: childMark } });
    expect(child.marks!.em).toBe(childMark);
    expect(child.marks!.strong).toBeUndefined();
  });

  it('inherits nodes from parent when not overridden', () => {
    const nodeSpec = { group: 'block', content: 'inline*', toDOM() { return ['p', 0]; } };
    const parent = createPlugin({ name: 'parent', nodes: { paragraph: nodeSpec } });
    const child  = parent.extend({ name: 'child' });
    expect(child.nodes!.paragraph).toBe(nodeSpec);
  });

  // ---------------------------------------------------------------------------
  // getKeymap
  // ---------------------------------------------------------------------------
  it('inherits getKeymap from parent when not overridden', () => {
    const schema = makeSchema();
    const parentMap = { 'Mod-b': () => true };
    const parent = createPlugin({ name: 'parent', getKeymap: () => parentMap });
    const child  = parent.extend({ name: 'child' });
    expect(child.getKeymap!(schema)).toEqual(parentMap);
  });

  it('replaces getKeymap entirely when child provides one', () => {
    const schema    = makeSchema();
    const childMap  = { 'Ctrl-b': () => true };
    const parent = createPlugin({ name: 'parent', getKeymap: () => ({ 'Mod-b': () => true }) });
    const child  = parent.extend({ name: 'child', getKeymap: () => childMap });
    const result = child.getKeymap!(schema);
    expect(result['Ctrl-b']).toBeDefined();
    expect(result['Mod-b']).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // getToolbarItems
  // ---------------------------------------------------------------------------
  it('inherits getToolbarItems from parent when not overridden', () => {
    const schema = makeSchema();
    const item = { id: 'btn', tooltip: 'test' };
    const parent = createPlugin({
      name: 'parent',
      getToolbarItems: () => [item],
    });
    const child = parent.extend({ name: 'child' });
    const items = child.getToolbarItems!(schema);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('btn');
  });

  // ---------------------------------------------------------------------------
  // getInputRules
  // ---------------------------------------------------------------------------
  it('inherits getInputRules from parent when not overridden', () => {
    const schema = makeSchema();
    const parent = createPlugin({
      name: 'parent',
      getInputRules: () => [],
    });
    const child = parent.extend({ name: 'child' });
    expect(child.getInputRules!(schema)).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // addOptions / addStorage
  // ---------------------------------------------------------------------------
  it('inherits addOptions from parent when not overridden', () => {
    const parent = createPlugin({
      name: 'parent',
      addOptions: () => ({ color: 'red', size: 12 }),
    });
    const child = parent.extend({ name: 'child' });
    expect((child as any).defaultOptions).toEqual({ color: 'red', size: 12 });
  });

  it('replaces addOptions when child provides one', () => {
    const parent = createPlugin({
      name: 'parent',
      addOptions: () => ({ color: 'red', size: 12 }),
    });
    const child = parent.extend({
      name: 'child',
      addOptions: () => ({ color: 'blue', size: 14 }),
    });
    expect((child as any).defaultOptions).toEqual({ color: 'blue', size: 14 });
  });

  // ---------------------------------------------------------------------------
  // addCommands
  // ---------------------------------------------------------------------------
  it('inherits commands from parent when not overridden', () => {
    const cmd = () => () => true;
    const parent = createPlugin({
      name: 'parent',
      addCommands() { return { myCmd: cmd }; },
    });
    const child = parent.extend({ name: 'child' });
    expect(child.commands).toBeDefined();
    expect(child.commands!.myCmd).toBe(cmd);
  });

  it('replaces commands when child provides addCommands', () => {
    const parentCmd = () => () => true;
    const childCmd  = () => () => false;
    const parent = createPlugin({
      name: 'parent',
      addCommands() { return { parentCmd }; },
    });
    const child = parent.extend({
      name: 'child',
      addCommands() { return { childCmd }; },
    });
    expect(child.commands!.childCmd).toBe(childCmd);
    expect(child.commands!.parentCmd).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Lifecycle hooks
  // ---------------------------------------------------------------------------
  it('inherits onCreate from parent when not overridden', () => {
    const onCreate = jest.fn();
    const parent = createPlugin({ name: 'parent', onCreate });
    const child  = parent.extend({ name: 'child' });
    expect(child.onCreate).toBeDefined();
    // The hook is wrapped, verify it delegates to the original fn
    child.onCreate!({} as any);
    expect(onCreate).toHaveBeenCalled();
  });

  it('replaces onCreate when child provides one', () => {
    const parentHook = jest.fn();
    const childHook  = jest.fn();
    const parent = createPlugin({ name: 'parent', onCreate: parentHook });
    const child  = parent.extend({ name: 'child', onCreate: childHook });
    child.onCreate!({} as any);
    expect(childHook).toHaveBeenCalled();
    expect(parentHook).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Chaining
  // ---------------------------------------------------------------------------
  it('supports multi-level chained extend()', () => {
    const base = createPlugin({ name: 'base', tier: 'free' });
    const mid  = base.extend({ name: 'mid',  tier: 'pro' });
    const top  = mid.extend({ name: 'top',   tier: 'premium' });
    expect(top.name).toBe('top');
    expect(top.tier).toBe('premium');
    expect(typeof top.extend).toBe('function');
  });

  it('extended plugin returned by extend() also has extend()', () => {
    const parent = createPlugin({ name: 'parent' });
    const child  = parent.extend({ name: 'child' });
    expect(typeof child.extend).toBe('function');
  });

  // ---------------------------------------------------------------------------
  // Immutability of parent
  // ---------------------------------------------------------------------------
  it('does not mutate the original plugin', () => {
    const parent = createPlugin({ name: 'parent', tier: 'free' });
    parent.extend({ name: 'child', tier: 'pro' });
    expect(parent.name).toBe('parent');
    expect(parent.tier).toBe('free');
  });

  // ---------------------------------------------------------------------------
  // PluginManager integration
  // ---------------------------------------------------------------------------
  it('can be registered in PluginManager', () => {
    const parent = createPlugin({ name: 'parent' });
    const child  = parent.extend({ name: 'child' });
    const manager = new PluginManager();
    manager.registerPlugin(child);
    expect(manager.getPlugin('child')).toBe(child);
  });

  it('parent and child can both be registered in PluginManager under different names', () => {
    const parent = createPlugin({ name: 'bold' });
    const child  = parent.extend({ name: 'custom-bold' });
    const manager = new PluginManager();
    manager.registerPlugin(parent);
    manager.registerPlugin(child);
    expect(manager.getPlugin('bold')).toBe(parent);
    expect(manager.getPlugin('custom-bold')).toBe(child);
  });
});
