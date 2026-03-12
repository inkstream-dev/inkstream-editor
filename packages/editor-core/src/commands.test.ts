/**
 * Tests for the CommandChain / chainable commands API.
 *
 * Covers:
 * - CommandChain.run() executes queued commands
 * - can() (isDryRun) passes undefined dispatch — commands don't mutate state
 * - focus() is a no-op in dry-run mode
 * - Plugin commands registered via addCommands() are attached as chain methods
 * - PluginManager.getCommands() aggregates across all plugins
 * - Later-registered plugin overrides earlier command with same name
 */

import { EditorState, Transaction } from '@inkstream/pm/state';
import { CommandChain, PluginManager, createPlugin, inkstreamSchema } from './index';
import { availablePlugins } from '@inkstream/starter-kit';
import { getTestSchema, createState, p, text } from './test-utils';

// ---------------------------------------------------------------------------
// Shared test setup
// ---------------------------------------------------------------------------

function buildTestState() {
  const schema = getTestSchema();
  const docNode = schema.node('doc', null, [
    p(schema, text(schema, 'Hello world')),
  ]);
  return createState(docNode);
}

/** Minimal EditorView stub that records dispatched transactions. */
function makeMockView(state: EditorState) {
  const dispatched: Transaction[] = [];
  let currentState = state;
  const focused = { value: false };

  const view = {
    get state() { return currentState; },
    dispatch(tr: Transaction) {
      dispatched.push(tr);
      currentState = currentState.apply(tr);
    },
    focus() { focused.value = true; },
    _dispatched: dispatched,
    _focused: focused,
  };
  return view as any;
}

// ---------------------------------------------------------------------------
// CommandChain — core behaviour
// ---------------------------------------------------------------------------

describe('CommandChain', () => {
  test('run() returns false when view is null', () => {
    const chain = new CommandChain(() => null, {});
    expect(chain.run()).toBe(false);
  });

  test('run() returns true when queue is empty', () => {
    const state = buildTestState();
    const view = makeMockView(state);
    const chain = new CommandChain(() => view, {});
    expect(chain.run()).toBe(true);
  });

  test('run() executes queued commands and returns true when all succeed', () => {
    const state = buildTestState();
    const view = makeMockView(state);
    const calls: string[] = [];

    const commands = {
      cmdA: () => () => { calls.push('A'); return true; },
      cmdB: () => () => { calls.push('B'); return true; },
    };

    const chain = new CommandChain(() => view, commands);
    (chain as any).cmdA().cmdB().run();

    expect(calls).toEqual(['A', 'B']);
  });

  test('run() returns false if any command fails', () => {
    const state = buildTestState();
    const view = makeMockView(state);

    const commands = {
      succeed: () => () => true,
      fail:    () => () => false,
    };

    const chain = new CommandChain(() => view, commands);
    const result = (chain as any).succeed().fail().succeed().run();
    expect(result).toBe(false);
  });

  test('commands receive live view.state (not stale snapshot)', () => {
    const schema = getTestSchema();
    const initial = createState(
      schema.node('doc', null, [p(schema, text(schema, 'Hi'))])
    );
    const view = makeMockView(initial);

    const seenStates: EditorState[] = [];
    const commands = {
      probe: () => ({ state }: any) => { seenStates.push(state); return true; },
      mutate: () => ({ state, dispatch }: any) => {
        if (dispatch) dispatch(state.tr.insertText(' world', state.doc.content.size - 1));
        return true;
      },
    };

    const chain = new CommandChain(() => view, commands);
    (chain as any).probe().mutate().probe().run();

    // Second probe sees updated state
    expect(seenStates[0]).toBe(seenStates[1] === seenStates[0] ? seenStates[0] : seenStates[0]);
    expect(seenStates[1]).not.toBe(seenStates[0]);
  });
});

// ---------------------------------------------------------------------------
// CommandChain — dry-run (can())
// ---------------------------------------------------------------------------

describe('CommandChain — isDryRun', () => {
  test('dispatch is undefined inside commands in dry-run mode', () => {
    const state = buildTestState();
    const view = makeMockView(state);

    let receivedDispatch: any = 'not-set';
    const commands = {
      probe: () => ({ dispatch }: any) => {
        receivedDispatch = dispatch;
        return true;
      },
    };

    const chain = new CommandChain(() => view, commands, true);
    (chain as any).probe().run();

    expect(receivedDispatch).toBeUndefined();
  });

  test('no transactions dispatched in dry-run mode', () => {
    const state = buildTestState();
    const view = makeMockView(state);

    const commands = {
      mutate: () => ({ state: s, dispatch }: any) => {
        if (dispatch) dispatch(s.tr.insertText('X', 1));
        return true;
      },
    };

    const chain = new CommandChain(() => view, commands, true);
    (chain as any).mutate().run();

    expect(view._dispatched.length).toBe(0);
  });

  test('focus() is a no-op in dry-run mode', () => {
    const state = buildTestState();
    const view = makeMockView(state);
    const chain = new CommandChain(() => view, {}, true);
    chain.focus().run();
    expect(view._focused.value).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CommandChain — focus()
// ---------------------------------------------------------------------------

describe('CommandChain.focus()', () => {
  test('calls view.focus() and returns true in normal mode', () => {
    const state = buildTestState();
    const view = makeMockView(state);
    const chain = new CommandChain(() => view, {});
    const result = chain.focus().run();
    expect(result).toBe(true);
    expect(view._focused.value).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Plugin addCommands integration
// ---------------------------------------------------------------------------

describe('Plugin.addCommands integration', () => {
  function buildManager(...plugins: ReturnType<typeof createPlugin>[]) {
    const manager = new PluginManager();
    plugins.forEach(p => manager.registerPlugin(p));
    return manager;
  }

  test('addCommands() commands are collected by getCommands()', () => {
    const plugin = createPlugin({
      name: 'test',
      addCommands() {
        return {
          doSomething: () => () => true,
        };
      },
    });

    const manager = buildManager(plugin);
    const commands = manager.getCommands();
    expect(typeof commands.doSomething).toBe('function');
  });

  test('plugin with no addCommands contributes nothing to getCommands()', () => {
    const plugin = createPlugin({ name: 'noCommands' });
    const manager = buildManager(plugin);
    expect(Object.keys(manager.getCommands())).toHaveLength(0);
  });

  test('later-registered plugin wins when command names conflict', () => {
    const first = createPlugin({
      name: 'first',
      addCommands: () => ({ shared: () => () => false }),
    });
    const second = createPlugin({
      name: 'second',
      addCommands: () => ({ shared: () => () => true }),
    });

    const manager = buildManager(first, second);
    const schema = getTestSchema();
    const state = buildTestState();
    const view = makeMockView(state);

    const chain = new CommandChain(() => view, manager.getCommands());
    const result = (chain as any).shared().run();
    expect(result).toBe(true);
  });

  test('bold plugin exposes toggleBold command', () => {
    const manager = new PluginManager();
    Object.values(availablePlugins).forEach(p => manager.registerPlugin(p));
    const commands = manager.getCommands();
    expect(typeof commands.toggleBold).toBe('function');
  });

  test('italic plugin exposes toggleItalic command', () => {
    const manager = new PluginManager();
    Object.values(availablePlugins).forEach(p => manager.registerPlugin(p));
    const commands = manager.getCommands();
    expect(typeof commands.toggleItalic).toBe('function');
  });

  test('heading plugin exposes setHeading and setParagraph commands', () => {
    const manager = new PluginManager();
    Object.values(availablePlugins).forEach(p => manager.registerPlugin(p));
    const commands = manager.getCommands();
    expect(typeof commands.setHeading).toBe('function');
    expect(typeof commands.setParagraph).toBe('function');
  });

  test('toggleBold actually applies the strong mark', () => {
    const manager = new PluginManager();
    Object.values(availablePlugins).forEach(p => manager.registerPlugin(p));
    const schema = inkstreamSchema(manager);

    // Build a state with the full schema and a text selection
    const docNode = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('Hello')]),
    ]);
    const { EditorState } = require('@inkstream/pm/state');
    const { TextSelection } = require('@inkstream/pm/state');
    const state = EditorState.create({ schema, doc: docNode });
    const sel = TextSelection.create(state.doc, 1, 6); // select "Hello"
    const stateWithSel = state.apply(state.tr.setSelection(sel));

    const view = makeMockView(stateWithSel);
    const chain = new CommandChain(() => view, manager.getCommands());
    const result = (chain as any).toggleBold().run();

    expect(result).toBe(true);
    expect(view._dispatched.length).toBe(1);
    // Verify the mark was added
    const appliedState = view.state;
    const hasBold = appliedState.doc.rangeHasMark(1, 6, schema.marks.strong);
    expect(hasBold).toBe(true);
  });
});
