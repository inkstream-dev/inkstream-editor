/**
 * @jest-environment jsdom
 *
 * InkstreamEditor requires DOM APIs (EditorView needs a real HTMLElement).
 * This file overrides the global testEnvironment (node) to jsdom for these
 * tests only.
 */

import { InkstreamEditor } from './InkstreamEditor';
import { EditorView } from '@inkstream/pm/view';
import { availablePlugins } from '@inkstream/starter-kit';
import type { EditorState } from '@inkstream/pm/state';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Creates a fresh div element to mount the editor into. */
function makeEl(): HTMLElement {
  return document.createElement('div');
}

/** All available plugins registered — gives us a full schema for testing. */
const allPlugins = Object.values(availablePlugins);

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe('InkstreamEditor — construction', () => {
  let editor: InkstreamEditor;

  afterEach(() => editor?.destroy());

  it('creates an EditorView mounted into the provided element', () => {
    const el = makeEl();
    document.body.appendChild(el);
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    expect(editor.getView()).toBeInstanceOf(EditorView);
  });

  it('getState() returns a non-null EditorState after construction', () => {
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    expect(editor.getState()).not.toBeNull();
  });

  it('store is seeded with initial state (getSnapshot returns non-null)', () => {
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    expect(editor.store.getSnapshot()).not.toBeNull();
  });

  it('schema contains all plugin-contributed nodes and marks', () => {
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    expect(editor.schema.nodes.paragraph).toBeDefined();
    expect(editor.schema.marks.strong).toBeDefined();
    expect(editor.schema.marks.em).toBeDefined();
  });

  it('onReady callback is fired with the EditorView', () => {
    const el = makeEl();
    const onReady = jest.fn();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins, onReady });
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(editor.getView());
  });

  it('initialContent is parsed into the document', () => {
    const el = makeEl();
    editor = new InkstreamEditor({
      element: el,
      plugins: allPlugins,
      initialContent: '<p>Hello world</p>',
    });
    const state = editor.getState()!;
    expect(state.doc.textContent).toBe('Hello world');
  });

  it('works with only core structural plugins', () => {
    const el = makeEl();
    editor = new InkstreamEditor({
      element: el,
      plugins: [availablePlugins.paragraph, availablePlugins.hardBreak],
    });
    expect(editor.getView()).toBeInstanceOf(EditorView);
  });
});

// ---------------------------------------------------------------------------
// Chain / can API
// ---------------------------------------------------------------------------

describe('InkstreamEditor — chain() / can()', () => {
  let editor: InkstreamEditor;

  beforeEach(() => {
    const el = makeEl();
    document.body.appendChild(el);
    editor = new InkstreamEditor({
      element: el,
      plugins: allPlugins,
      initialContent: '<p>Hello world</p>',
    });
  });

  afterEach(() => editor.destroy());

  it('chain().focus().run() returns true', () => {
    expect(editor.chain().focus().run()).toBe(true);
  });

  it('chain().toggleBold().run() applies bold mark to selection', () => {
    // Select all text in the document
    const state = editor.getState()!;
    const { tr } = state;
    const { TextSelection } = require('@inkstream/pm/state');
    const sel = TextSelection.create(state.doc, 1, state.doc.content.size - 1);
    editor.getView()!.dispatch(tr.setSelection(sel));

    const result = editor.chain().toggleBold().run();
    expect(result).toBe(true);
    const afterState = editor.getState()!;
    expect(afterState.doc.rangeHasMark(1, afterState.doc.content.size - 1, editor.schema.marks.strong)).toBe(true);
  });

  it('can().toggleBold().run() returns boolean without mutating state', () => {
    const stateBefore = editor.getState();
    const result = editor.can().toggleBold().run();
    expect(typeof result).toBe('boolean');
    // State must not have changed
    expect(editor.getState()).toBe(stateBefore);
  });

  it('can().run() returns false after destroy()', () => {
    editor.destroy();
    expect(editor.can().run()).toBe(false);
  });

  it('chain().run() returns false after destroy()', () => {
    editor.destroy();
    expect(editor.chain().run()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// subscribe()
// ---------------------------------------------------------------------------

describe('InkstreamEditor — subscribe()', () => {
  let editor: InkstreamEditor;

  beforeEach(() => {
    const el = makeEl();
    document.body.appendChild(el);
    editor = new InkstreamEditor({ element: el, plugins: allPlugins, initialContent: '<p>Hi</p>' });
  });

  afterEach(() => editor.destroy());

  it('subscriber is called when a transaction is dispatched', () => {
    const cb = jest.fn();
    editor.subscribe(cb);
    // Dispatch a no-op transaction to trigger update
    const view = editor.getView()!;
    view.dispatch(view.state.tr.insertText(' there', view.state.doc.content.size - 1));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('returns an unsubscribe function that stops notifications', () => {
    const cb = jest.fn();
    const unsub = editor.subscribe(cb);
    unsub();
    const view = editor.getView()!;
    view.dispatch(view.state.tr.insertText('x', view.state.doc.content.size - 1));
    expect(cb).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getContent() / setContent()
// ---------------------------------------------------------------------------

describe('InkstreamEditor — getContent() / setContent()', () => {
  let editor: InkstreamEditor;

  beforeEach(() => {
    const el = makeEl();
    document.body.appendChild(el);
    editor = new InkstreamEditor({
      element: el,
      plugins: allPlugins,
      initialContent: '<p>Initial</p>',
    });
  });

  afterEach(() => editor.destroy());

  it('getContent() returns a non-empty HTML string', () => {
    const html = editor.getContent();
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  it('getContent() contains the initial content text', () => {
    expect(editor.getContent()).toContain('Initial');
  });

  it('setContent() replaces the document', () => {
    editor.setContent('<p>Replaced</p>');
    expect(editor.getContent()).toContain('Replaced');
    expect(editor.getContent()).not.toContain('Initial');
  });

  it('setContent() updates the store snapshot', () => {
    editor.setContent('<p>Updated</p>');
    const snap = editor.store.getSnapshot()!;
    expect(snap.doc.textContent).toBe('Updated');
  });

  it('getContent() returns empty string after destroy()', () => {
    editor.destroy();
    expect(editor.getContent()).toBe('');
  });

  it('setContent() is a no-op after destroy()', () => {
    editor.destroy();
    expect(() => editor.setContent('<p>x</p>')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// onChange callback
// ---------------------------------------------------------------------------

describe('InkstreamEditor — onChange', () => {
  let editor: InkstreamEditor;

  afterEach(() => editor.destroy());

  it('onChange is called after a document change (debounced)', done => {
    const el = makeEl();
    document.body.appendChild(el);
    const onChange = jest.fn((html: string) => {
      expect(typeof html).toBe('string');
      done();
    });

    editor = new InkstreamEditor({
      element: el,
      plugins: allPlugins,
      initialContent: '<p>Start</p>',
      onChange,
      onChangeDebounceMs: 0, // flush immediately for test speed
    });

    const view = editor.getView()!;
    view.dispatch(view.state.tr.insertText('X', 2));
  });

  it('onChange is NOT called when docChanged is false', done => {
    const el = makeEl();
    document.body.appendChild(el);
    const onChange = jest.fn();

    editor = new InkstreamEditor({
      element: el,
      plugins: allPlugins,
      initialContent: '<p>Hi</p>',
      onChange,
      onChangeDebounceMs: 0,
    });

    const view = editor.getView()!;
    // Selection change only — docChanged is false
    const { TextSelection } = require('@inkstream/pm/state');
    const sel = TextSelection.create(view.state.doc, 1);
    view.dispatch(view.state.tr.setSelection(sel));

    // Give enough time for the debounce to fire if it were going to
    setTimeout(() => {
      expect(onChange).not.toHaveBeenCalled();
      done();
    }, 50);
  });

  it('updateCallbacks() replaces the onChange handler without recreating editor', done => {
    const el = makeEl();
    document.body.appendChild(el);
    const oldCb = jest.fn();
    editor = new InkstreamEditor({
      element: el,
      plugins: allPlugins,
      initialContent: '<p>Hi</p>',
      onChange: oldCb,
      onChangeDebounceMs: 0,
    });

    const newCb = jest.fn((html: string) => {
      expect(oldCb).not.toHaveBeenCalled();
      done();
    });
    editor.updateCallbacks({ onChange: newCb });

    const view = editor.getView()!;
    view.dispatch(view.state.tr.insertText('Y', 2));
  });
});

// ---------------------------------------------------------------------------
// Plugin lifecycle hooks
// ---------------------------------------------------------------------------

describe('InkstreamEditor — lifecycle hooks', () => {
  let editor: InkstreamEditor;
  afterEach(() => editor.destroy());

  it('onCreate is called for each plugin after construction', () => {
    const onCreate = jest.fn();
    const { createPlugin } = require('../plugins/plugin-factory');
    const plugin = createPlugin({ name: 'test-lifecycle', onCreate });

    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: [...allPlugins, plugin] });
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('onUpdate is called on each transaction', () => {
    const onUpdate = jest.fn();
    const { createPlugin } = require('../plugins/plugin-factory');
    const plugin = createPlugin({ name: 'test-update', onUpdate });

    const el = makeEl();
    document.body.appendChild(el);
    editor = new InkstreamEditor({
      element: el,
      plugins: [...allPlugins, plugin],
      initialContent: '<p>Hi</p>',
    });

    const view = editor.getView()!;
    view.dispatch(view.state.tr.insertText('X', 2));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('onDestroy is called for each plugin when destroy() is invoked', () => {
    const onDestroy = jest.fn();
    const { createPlugin } = require('../plugins/plugin-factory');
    const plugin = createPlugin({ name: 'test-destroy', onDestroy });

    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: [...allPlugins, plugin] });
    editor.destroy();
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('InkstreamEditor — destroy()', () => {
  it('isDestroyed() is false before destroy()', () => {
    const el = makeEl();
    const editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    expect(editor.isDestroyed()).toBe(false);
    editor.destroy();
  });

  it('isDestroyed() is true after destroy()', () => {
    const el = makeEl();
    const editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    editor.destroy();
    expect(editor.isDestroyed()).toBe(true);
  });

  it('calling destroy() twice is safe (no throw)', () => {
    const el = makeEl();
    const editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    expect(() => {
      editor.destroy();
      editor.destroy();
    }).not.toThrow();
  });

  it('getView() returns null after destroy()', () => {
    const el = makeEl();
    const editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    editor.destroy();
    expect(editor.getView()).toBeNull();
  });

  it('getState() returns null after destroy()', () => {
    const el = makeEl();
    const editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    editor.destroy();
    expect(editor.getState()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getToolbarItems()
// ---------------------------------------------------------------------------

describe('InkstreamEditor — getToolbarItems()', () => {
  let editor: InkstreamEditor;
  afterEach(() => editor.destroy());

  it('returns a Map of toolbar items from all registered plugins', () => {
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    const items = editor.getToolbarItems();
    expect(items).toBeInstanceOf(Map);
    expect(items.size).toBeGreaterThan(0);
  });

  it('items include bold and italic from the available plugins', () => {
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    const items = editor.getToolbarItems();
    expect(items.has('bold')).toBe(true);
    expect(items.has('italic')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// executeCommand()
// ---------------------------------------------------------------------------

describe('InkstreamEditor — executeCommand()', () => {
  let editor: InkstreamEditor;
  afterEach(() => editor.destroy());

  it('returns false for an unknown command', () => {
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    expect(editor.executeCommand('nonExistentCommand')).toBe(false);
  });

  it('executes a registered command by name and returns true on success', () => {
    const el = makeEl();
    document.body.appendChild(el);
    editor = new InkstreamEditor({ element: el, plugins: allPlugins, initialContent: '<p>Hello</p>' });
    editor.getView()!.focus();
    // Select all text using AllSelection so toggleBold has a non-empty range to apply to.
    const { AllSelection } = require('@inkstream/pm/state');
    const tr = editor.getState()!.tr.setSelection(new AllSelection(editor.getState()!.doc));
    editor.getView()!.dispatch(tr);
    const result = editor.executeCommand('toggleBold');
    expect(result).toBe(true);
  });

  it('returns false after the editor is destroyed', () => {
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    editor.destroy();
    expect(editor.executeCommand('toggleBold')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// on() / off() / event emission
// ---------------------------------------------------------------------------

describe('InkstreamEditor — events', () => {
  let editor: InkstreamEditor;
  afterEach(() => editor?.destroy());

  it('emits "ready" once after construction with the EditorView', () => {
    const fn = jest.fn();
    const el = makeEl();
    // Attach listener before constructing via on() in the constructor
    // ready fires in constructor, so we verify via a callback in config instead
    editor = new InkstreamEditor({
      element: el,
      plugins: allPlugins,
      onReady: fn,
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toBeInstanceOf(EditorView);
  });

  it('emits "ready" via the event system (on listener added before construction would miss it — verify via onReady config)', () => {
    // "ready" is emitted synchronously in the constructor, so a listener
    // added after construction would miss it. Test the config-based pathway.
    const fn = jest.fn();
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins, onReady: fn });
    expect(fn).toHaveBeenCalledWith(expect.any(EditorView));
  });

  it('emits "update" on every transaction', () => {
    const updates: EditorState[] = [];
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    editor.on('update', state => updates.push(state));

    editor.chain().toggleBold().run();

    expect(updates.length).toBeGreaterThan(0);
    expect(updates[0]).not.toBeNull();
  });

  it('off() stops receiving events', () => {
    const fn = jest.fn();
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    editor.on('update', fn);
    editor.off('update', fn);

    editor.chain().toggleBold().run();

    expect(fn).not.toHaveBeenCalled();
  });

  it('emits "destroy" when destroy() is called', () => {
    const fn = jest.fn();
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    editor.on('destroy', fn);
    editor.destroy();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('emits "change" (debounced) when document content changes', async () => {
    const htmlValues: string[] = [];
    const el = makeEl();
    document.body.appendChild(el);
    editor = new InkstreamEditor({
      element: el,
      plugins: allPlugins,
      onChangeDebounceMs: 10,
    });
    editor.on('change', html => htmlValues.push(html));

    editor.setContent('<p>Updated content</p>');
    // setContent replaces state directly (no debounce) but does not fire onChange
    // Trigger via a transaction instead
    const view = editor.getView()!;
    const tr = view.state.tr.insertText(' extra');
    view.dispatch(tr);

    await new Promise(r => setTimeout(r, 50));

    expect(htmlValues.length).toBeGreaterThan(0);
    expect(typeof htmlValues[0]).toBe('string');
  });

  it('removeAllListeners() clears all event listeners', () => {
    const fn = jest.fn();
    const el = makeEl();
    editor = new InkstreamEditor({ element: el, plugins: allPlugins });
    editor.on('update', fn);
    editor.removeAllListeners();

    editor.chain().toggleBold().run();

    expect(fn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createEditor() factory
// ---------------------------------------------------------------------------

describe('createEditor()', () => {
  it('returns an InkstreamEditor instance', async () => {
    const { createEditor } = await import('../index');
    const el = makeEl();
    const editor = createEditor({ element: el, plugins: allPlugins });
    expect(editor).toBeInstanceOf(InkstreamEditor);
    editor.destroy();
  });
});
