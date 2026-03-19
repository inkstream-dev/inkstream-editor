import { Schema, DOMParser, DOMSerializer } from '@inkstream/pm/model';
import { EditorState, Transaction } from '@inkstream/pm/state';
import { EditorView } from '@inkstream/pm/view';
import { PluginManager, Plugin, ToolbarItem } from '../plugins';
import { inkstreamSchema } from '../schema';
import { buildInputRules } from '../input-rules';
import { buildKeymap } from '../keymap';
import { buildPastePlugin } from '../paste-rules';
import { CommandChain } from '../commands/chain';
import type { ChainedCommands } from '../commands/chain';
import { EditorStateStore } from './EditorStateStore';

// ---------------------------------------------------------------------------
// Public config types
// ---------------------------------------------------------------------------

/**
 * Configuration passed to the `InkstreamEditor` constructor.
 */
export interface InkstreamEditorConfig {
  /** DOM element to mount the editor into. */
  element: HTMLElement;
  /**
   * Array of Inkstream plugin instances to register.
   * Defaults to an empty set (no formatting, no toolbar items).
   */
  plugins?: Plugin[];
  /**
   * Initial HTML content for the editor document.
   * Parsed using ProseMirror's DOMParser. Defaults to an empty paragraph.
   */
  initialContent?: string;
  /**
   * Called whenever the document content changes, with the full document
   * serialised as an HTML string. Debounced by `onChangeDebounceMs` (default 300 ms)
   * to avoid blocking large-document serialisation on every keystroke.
   *
   * You can update this callback at any time without recreating the editor by
   * calling `editor.updateCallbacks({ onChange: newFn })`.
   */
  onChange?: (html: string) => void;
  /**
   * Debounce delay in milliseconds for the `onChange` callback.
   * Defaults to 300 ms.
   */
  onChangeDebounceMs?: number;
  /**
   * Called once after the `EditorView` is created and all plugin `onCreate`
   * hooks have fired.
   */
  onReady?: (view: EditorView) => void;
}

/**
 * Mutable callbacks that can be updated via `editor.updateCallbacks()` without
 * recreating the editor instance.
 */
export interface InkstreamEditorCallbacks {
  onChange?: (html: string) => void;
  onReady?: (view: EditorView) => void;
}

// ---------------------------------------------------------------------------
// InkstreamEditor
// ---------------------------------------------------------------------------

/**
 * Framework-agnostic headless editor controller.
 *
 * `InkstreamEditor` manages the full lifecycle of a ProseMirror editor:
 * - Builds the `PluginManager` and `Schema` from the provided plugins.
 * - Creates and owns the `EditorView`, mounting it into the supplied DOM element.
 * - Dispatches transactions and fires plugin lifecycle hooks (`onCreate`,
 *   `onUpdate`, `onDestroy`, `onFocus`, `onBlur`).
 * - Exposes a chainable command API (`chain()` / `can()`).
 * - Provides an `EditorStateStore` for framework-specific reactive subscriptions.
 * - Serialises/deserialises HTML via `getContent()` / `setContent()`.
 *
 * Framework-specific packages (React, Vue, Svelte, Vanilla) build on top of
 * this class rather than reimplementing the editor lifecycle themselves.
 *
 * @example
 * ```ts
 * // Vanilla JS
 * const editor = new InkstreamEditor({
 *   element: document.getElementById('editor')!,
 *   plugins: corePlugins,
 *   initialContent: '<p>Hello world</p>',
 *   onChange: html => console.log('Content changed:', html),
 * });
 *
 * // Programmatic commands
 * editor.chain().toggleBold().focus().run();
 * const canUndo = editor.can().undo().run(); // boolean dry-run
 *
 * // Reactive subscriptions (framework-agnostic)
 * const unsub = editor.store.subscribe(() => {
 *   renderMyToolbar(editor.store.getSnapshot());
 * });
 *
 * // Tear down
 * editor.destroy();
 * ```
 */
export class InkstreamEditor {
  // ---------------------------------------------------------------------------
  // Private state
  // ---------------------------------------------------------------------------

  private _view: EditorView | null = null;
  private _pluginManager: PluginManager;
  private _schema: Schema;
  private _plugins: Plugin[];
  private _onChangeCb: ((html: string) => void) | undefined;
  private _onReadyCb: ((view: EditorView) => void) | undefined;
  private _onChangeDebounceMs: number;
  private _changeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _destroyed = false;

  // ---------------------------------------------------------------------------
  // Public API: reactive store
  // ---------------------------------------------------------------------------

  /**
   * Pub/sub store that emits on every ProseMirror transaction.
   *
   * Framework adapters should subscribe to this store to trigger their own
   * re-render mechanism:
   *
   * ```ts
   * const unsub = editor.store.subscribe(() => {
   *   myFrameworkUpdate(editor.store.getSnapshot());
   * });
   * ```
   *
   * In React, use `useEditorState(editor.store, selector)` from
   * `@inkstream/react-editor` instead of subscribing directly.
   */
  readonly store: EditorStateStore;

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  constructor(config: InkstreamEditorConfig) {
    this._plugins = config.plugins ?? [];
    this._onChangeCb = config.onChange;
    this._onReadyCb = config.onReady;
    this._onChangeDebounceMs = config.onChangeDebounceMs ?? 300;
    this.store = new EditorStateStore();

    // Build PluginManager and Schema from the provided plugins.
    this._pluginManager = new PluginManager();
    this._plugins.forEach(p => this._pluginManager.registerPlugin(p));
    this._schema = inkstreamSchema(this._pluginManager);

    // Build the full ProseMirror plugin array.
    const pmPlugins = [
      ...this._pluginManager.getProseMirrorPlugins(this._schema),
      buildInputRules(this._schema),
      buildKeymap(this._schema, this._pluginManager),
      buildPastePlugin(this._pluginManager.getPasteRules(this._schema)),
    ];

    // Parse initial content.
    const doc = this._parseHTML(config.initialContent ?? '');

    const state = EditorState.create({
      schema: this._schema,
      doc,
      plugins: pmPlugins,
    });

    // Create the EditorView, mounting into the provided DOM element.
    this._view = new EditorView(config.element, {
      state,
      dispatchTransaction: this._handleDispatch.bind(this),
      handleDOMEvents: {
        focus: (v, event) => {
          this._plugins.forEach(p => p.onFocus?.({ view: v, event }));
          return false;
        },
        blur: (v, event) => {
          this._plugins.forEach(p => p.onBlur?.({ view: v, event }));
          return false;
        },
      },
      nodeViews: this._pluginManager.getNodeViews(),
    });

    // Seed the store with the initial state so subscribers render correctly
    // before the first user transaction fires.
    this.store.update(state);

    // Fire onCreate lifecycle hooks.
    this._plugins.forEach(p => p.onCreate?.({ view: this._view! }));

    // Notify consumer that the editor is ready.
    this._onReadyCb?.(this._view);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _handleDispatch(transaction: Transaction): void {
    if (!this._view || this._destroyed) return;

    const prevState = this._view.state;
    const newState = prevState.apply(transaction);
    this._view.updateState(newState);
    this.store.update(newState);

    // Fire onUpdate lifecycle hooks.
    this._plugins.forEach(p =>
      p.onUpdate?.({ view: this._view!, state: newState, prevState, tr: transaction }),
    );

    // Debounced HTML serialisation for onChange.
    if (this._onChangeCb && transaction.docChanged) {
      if (this._changeDebounceTimer !== null) {
        clearTimeout(this._changeDebounceTimer);
      }
      this._changeDebounceTimer = setTimeout(() => {
        this._changeDebounceTimer = null;
        if (!this._onChangeCb || !this._view) return;
        this._onChangeCb(this._serializeToHTML());
      }, this._onChangeDebounceMs);
    }
  }

  private _parseHTML(html: string): ReturnType<DOMParser['parse']> {
    try {
      const parser = DOMParser.fromSchema(this._schema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const domParser = new (globalThis as any).DOMParser() as { parseFromString(s: string, t: string): Document };
      const domDoc = domParser.parseFromString(html || '<p></p>', 'text/html');
      return parser.parse(domDoc.body);
    } catch {
      return this._schema.node('doc', null, [this._schema.node('paragraph')]);
    }
  }

  private _serializeToHTML(): string {
    if (!this._view) return '';
    const { state } = this._view;
    const div = document.createElement('div');
    DOMSerializer.fromSchema(state.schema).serializeFragment(state.doc.content, { document }, div);
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Public command API
  // ---------------------------------------------------------------------------

  /**
   * Returns a chainable command builder. Call `.run()` to execute.
   *
   * ```ts
   * editor.chain().toggleBold().setHeading(2).focus().run();
   * ```
   */
  chain(): ChainedCommands {
    return new CommandChain(
      () => this._view,
      this._pluginManager.getCommands(),
      false,
    ) as ChainedCommands;
  }

  /**
   * Returns a dry-run command builder that tests feasibility without mutating
   * state. `.run()` returns `true` if every command would succeed.
   *
   * ```ts
   * const canBold = editor.can().toggleBold().run();
   * ```
   */
  can(): ChainedCommands {
    return new CommandChain(
      () => this._view,
      this._pluginManager.getCommands(),
      true,
    ) as ChainedCommands;
  }

  // ---------------------------------------------------------------------------
  // Public view/state accessors
  // ---------------------------------------------------------------------------

  /** Returns the live `EditorView`, or `null` after `destroy()` is called. */
  getView(): EditorView | null {
    return this._view;
  }

  /** Returns the current `EditorState`, or `null` after `destroy()`. */
  getState(): EditorState | null {
    return this._view?.state ?? null;
  }

  // ---------------------------------------------------------------------------
  // Public content API
  // ---------------------------------------------------------------------------

  /**
   * Returns the current document serialised as an HTML string.
   * Returns an empty string after `destroy()` is called.
   */
  getContent(): string {
    return this._serializeToHTML();
  }

  /**
   * Replaces the entire document with the content parsed from `html`.
   *
   * This creates a fresh `EditorState` (replacing undo history). If you
   * want to preserve undo history, use a transaction instead.
   */
  setContent(html: string): void {
    if (!this._view || this._destroyed) return;
    const doc = this._parseHTML(html);
    const newState = EditorState.create({
      schema: this._schema,
      doc,
      plugins: this._view.state.plugins,
    });
    this._view.updateState(newState);
    this.store.update(newState);
  }

  // ---------------------------------------------------------------------------
  // Public subscription API
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to editor state changes. Returns an unsubscribe function.
   *
   * This is a convenience wrapper around `editor.store.subscribe(listener)`.
   *
   * @example
   * ```ts
   * const unsub = editor.subscribe(() => {
   *   const state = editor.getState();
   *   if (state) updateUI(state);
   * });
   * // Later:
   * unsub();
   * ```
   */
  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  // ---------------------------------------------------------------------------
  // Toolbar helper
  // ---------------------------------------------------------------------------

  /**
   * Returns the toolbar items map contributed by all registered plugins.
   *
   * `pluginOptions` is an optional per-plugin options override object
   * (keyed by plugin name). Defaults are merged with any provided overrides.
   *
   * Framework UIs (React Toolbar, Vue toolbar, etc.) call this to get the
   * ordered list of buttons and separators.
   *
   * @example
   * ```ts
   * const items = editor.getToolbarItems({ textColor: { palette: myColors } });
   * ```
   */
  getToolbarItems(
    pluginOptions?: { [pluginName: string]: Record<string, unknown> },
  ): Map<string, ToolbarItem> {
    return this._pluginManager.getToolbarItems(this._schema, pluginOptions);
  }

  // ---------------------------------------------------------------------------
  // Callback updater (avoids editor recreation on callback identity changes)
  // ---------------------------------------------------------------------------

  /**
   * Updates mutable callbacks without recreating the editor.
   *
   * Framework-specific wrappers (e.g. the React component) call this in a
   * separate effect whenever the consumer's `onChange` or `onReady` prop changes,
   * avoiding unnecessary editor tear-down and reconstruction.
   */
  updateCallbacks(callbacks: InkstreamEditorCallbacks): void {
    if ('onChange' in callbacks) this._onChangeCb = callbacks.onChange;
    if ('onReady' in callbacks) this._onReadyCb = callbacks.onReady;
  }

  // ---------------------------------------------------------------------------
  // Read-only accessors for framework adapters
  // ---------------------------------------------------------------------------

  /** The `PluginManager` built from the provided plugins. */
  get pluginManager(): PluginManager {
    return this._pluginManager;
  }

  /** The ProseMirror `Schema` constructed from the registered plugins. */
  get schema(): Schema {
    return this._schema;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Destroys the editor:
   * 1. Cancels any pending `onChange` debounce timer.
   * 2. Fires `onDestroy` on all plugins.
   * 3. Destroys the `EditorView`.
   *
   * After calling `destroy()`, all API methods are no-ops and `getView()` /
   * `getState()` return `null`.
   */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._changeDebounceTimer !== null) {
      clearTimeout(this._changeDebounceTimer);
      this._changeDebounceTimer = null;
    }

    this._plugins.forEach(p => p.onDestroy?.());

    if (this._view) {
      this._view.destroy();
      this._view = null;
    }
  }

  /** Returns `true` after `destroy()` has been called. */
  isDestroyed(): boolean {
    return this._destroyed;
  }
}
