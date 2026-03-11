import { Schema } from '@inkstream/pm/model';
import { Plugin as ProseMirrorPlugin } from '@inkstream/pm/state';
import { ToolbarItem, Plugin } from './index';
import { InputRule } from '@inkstream/pm/inputrules';
import { PluginTier } from '../license';

/**
 * The `this` context bound to every plugin method when called through
 * `createPlugin`. Gives method bodies access to the plugin's resolved options
 * (defaults merged with user-provided overrides) without an extra argument.
 *
 * Example:
 * ```ts
 * createPlugin<TextColorOptions>({
 *   addOptions: () => ({ palette: DEFAULT_PALETTE }),
 *   getToolbarItems(schema) {
 *     const { palette } = this.options; // typed as TextColorOptions
 *   }
 * });
 * ```
 */
export interface PluginContext<TOptions> {
  /** Resolved options: defaults from `addOptions()` deep-merged with any
   *  user-provided overrides from the `pluginOptions` prop. */
  options: TOptions;
}

export interface PluginConfig<TOptions = Record<string, unknown>> {
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
  getProseMirrorPlugins?: (this: PluginContext<TOptions>, schema: Schema) => ProseMirrorPlugin[];
  /** `this.options` is the merged (defaults + user overrides) options object. */
  getToolbarItems?: (this: PluginContext<TOptions>, schema: Schema, options: TOptions) => ToolbarItem[];
  getInputRules?: (this: PluginContext<TOptions>, schema: Schema) => InputRule[];
  getKeymap?: (this: PluginContext<TOptions>, schema: Schema) => { [key: string]: any };
}

/**
 * Creates a typed plugin. Supply a `TOptions` generic parameter to get
 * autocomplete and type checking on `this.options` inside method bodies and on
 * the corresponding `pluginOptions[name]` consumer-facing override object.
 */
export function createPlugin<TOptions = Record<string, unknown>>(
  config: PluginConfig<TOptions>,
): Plugin {
  const defaultOptions: TOptions = config.addOptions ? config.addOptions() : ({} as TOptions);

  /** Build the `this` context, merging defaults with any runtime overrides. */
  const makeContext = (overrides?: Record<string, unknown>): PluginContext<TOptions> => ({
    options: overrides
      ? { ...defaultOptions, ...overrides } as TOptions
      : defaultOptions,
  });

  return {
    name: config.name,
    tier: config.tier || 'free',
    description: config.description,
    nodes: config.nodes,
    marks: config.marks,
    defaultOptions,
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
  };
}
