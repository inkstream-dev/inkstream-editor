import { Schema } from '@inkstream/pm/model';
import { Plugin as ProseMirrorPlugin } from '@inkstream/pm/state';
import { ToolbarItem, Plugin, PasteRule, EditorLifecycleContext, UpdateLifecycleContext, FocusLifecycleContext } from './index';
import { InputRule } from '@inkstream/pm/inputrules';
import { PluginTier } from '../license';
import { CommandsMap } from '../commands/types';

/**
 * The `this` context bound to every plugin method when called through
 * `createPlugin`. Gives method bodies access to the plugin's resolved options
 * (defaults merged with user-provided overrides) and mutable per-instance
 * storage without extra arguments.
 *
 * Example:
 * ```ts
 * createPlugin<TextColorOptions, { lastColor: string }>({
 *   addOptions: () => ({ palette: DEFAULT_PALETTE }),
 *   addStorage: () => ({ lastColor: '#000' }),
 *   getToolbarItems(schema) {
 *     const { palette } = this.options;   // typed as TextColorOptions
 *     const { lastColor } = this.storage; // typed as { lastColor: string }
 *   }
 * });
 * ```
 */
export interface PluginContext<TOptions, TStorage = Record<string, unknown>> {
  /** Resolved options: defaults from `addOptions()` deep-merged with any
   *  user-provided overrides from the `pluginOptions` prop. */
  options: TOptions;
  /** Mutable per-instance state initialised once by `addStorage()`. */
  storage: TStorage;
}

export interface PluginConfig<TOptions = Record<string, unknown>, TStorage = Record<string, unknown>> {
  name: string;
  tier?: PluginTier;
  description?: string;
  nodes?: { [key: string]: any };
  marks?: { [key: string]: any };
  /**
   * Return the default options for this plugin. Merged with user-provided
   * overrides at toolbar render time so that `this.options` is always complete.
   */
  addOptions?: () => TOptions;
  /**
   * Return the initial storage object for this plugin instance.
   * The same object is mutated in place; use it to track plugin-level state
   * (e.g. word counts, computed caches) that survives across transactions.
   */
  addStorage?: () => TStorage;
  getProseMirrorPlugins?: (this: PluginContext<TOptions, TStorage>, schema: Schema) => ProseMirrorPlugin[];
  /** `this.options` is the merged (defaults + user overrides) options object. */
  getToolbarItems?: (this: PluginContext<TOptions, TStorage>, schema: Schema, options: TOptions) => ToolbarItem[];
  getInputRules?: (this: PluginContext<TOptions, TStorage>, schema: Schema) => InputRule[];
  getKeymap?: (this: PluginContext<TOptions, TStorage>, schema: Schema) => { [key: string]: any };
  /** Return paste-time rules applied only to newly inserted content. */
  getPasteRules?: (this: PluginContext<TOptions, TStorage>, schema: Schema) => PasteRule[];
  /**
   * Return a map of named commands exposed via `editor.chain()` / `editor.can()`.
   *
   * Each key is the public command name; the value is a **creator** function
   * that accepts optional arguments and returns the command function.
   * The command function receives `{ state, dispatch, view, tr }` and returns
   * a boolean indicating success.
   *
   * Using `state.schema` inside the command body is the recommended way to
   * access marks and nodes — no need to capture `schema` upfront.
   *
   * Example:
   * ```ts
   * addCommands() {
   *   return {
   *     toggleBold: () => ({ state, dispatch }) =>
   *       toggleMark(state.schema.marks.strong)(state, dispatch),
   *     setHeading: (level: number) => ({ state, dispatch }) =>
   *       setBlockType(state.schema.nodes.heading, { level })(state, dispatch),
   *   };
   * }
   * ```
   */
  addCommands?: (this: PluginContext<TOptions, TStorage>) => CommandsMap;
  /** Called once after the EditorView is created. `this.options` and `this.storage` are available. */
  onCreate?: (this: PluginContext<TOptions, TStorage>, ctx: EditorLifecycleContext) => void;
  /** Called on every transaction dispatch. `this.options` and `this.storage` are available. */
  onUpdate?: (this: PluginContext<TOptions, TStorage>, ctx: UpdateLifecycleContext) => void;
  /** Called before the EditorView is destroyed. `this.options` and `this.storage` are available. */
  onDestroy?: (this: PluginContext<TOptions, TStorage>) => void;
  /** Called when the editor gains focus. `this.options` and `this.storage` are available. */
  onFocus?: (this: PluginContext<TOptions, TStorage>, ctx: FocusLifecycleContext) => void;
  /** Called when the editor loses focus. `this.options` and `this.storage` are available. */
  onBlur?: (this: PluginContext<TOptions, TStorage>, ctx: FocusLifecycleContext) => void;
}

/**
 * Creates a typed plugin. Supply `TOptions` and (optionally) `TStorage`
 * generics to get autocomplete on `this.options` / `this.storage` inside
 * method bodies and on the `pluginOptions[name]` consumer-facing prop.
 */
export function createPlugin<
  TOptions = Record<string, unknown>,
  TStorage = Record<string, unknown>,
>(
  config: PluginConfig<TOptions, TStorage>,
): Plugin {
  const defaultOptions: TOptions = config.addOptions ? config.addOptions() : ({} as TOptions);
  // Storage is created once per plugin instance and mutated in place.
  const storage: TStorage = config.addStorage ? config.addStorage() : ({} as TStorage);

  /** Build the `this` context, merging defaults with any runtime overrides. */
  const makeContext = (overrides?: Record<string, unknown>): PluginContext<TOptions, TStorage> => ({
    options: overrides
      ? { ...defaultOptions, ...overrides } as TOptions
      : defaultOptions,
    storage,
  });

  return {
    name: config.name,
    tier: config.tier || 'free',
    description: config.description,
    nodes: config.nodes,
    marks: config.marks,
    defaultOptions,
    storage,
    getProseMirrorPlugins: config.getProseMirrorPlugins
      ? (schema) => config.getProseMirrorPlugins!.call(makeContext(), schema)
      : () => [],
    getToolbarItems: config.getToolbarItems
      ? (schema, options?) => {
          const ctx = makeContext(options as Record<string, unknown> | undefined);
          return config.getToolbarItems!.call(ctx, schema, ctx.options);
        }
      : () => [],
    getInputRules: config.getInputRules
      ? (schema) => config.getInputRules!.call(makeContext(), schema)
      : () => [],
    getKeymap: config.getKeymap
      ? (schema) => config.getKeymap!.call(makeContext(), schema)
      : () => ({}),
    getPasteRules: config.getPasteRules
      ? (schema) => config.getPasteRules!.call(makeContext(), schema)
      : undefined,
    commands: config.addCommands
      ? config.addCommands.call(makeContext())
      : undefined,
    onCreate: config.onCreate
      ? (ctx) => config.onCreate!.call(makeContext(), ctx)
      : undefined,
    onUpdate: config.onUpdate
      ? (ctx) => config.onUpdate!.call(makeContext(), ctx)
      : undefined,
    onDestroy: config.onDestroy
      ? () => config.onDestroy!.call(makeContext())
      : undefined,
    onFocus: config.onFocus
      ? (ctx) => config.onFocus!.call(makeContext(), ctx)
      : undefined,
    onBlur: config.onBlur
      ? (ctx) => config.onBlur!.call(makeContext(), ctx)
      : undefined,
  };
}
