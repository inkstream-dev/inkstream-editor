import { PluginManager, Plugin, ToolbarItem } from './plugins';
import { inkstreamSchema } from './schema';
import { buildInputRules } from './input-rules';
import { buildKeymap } from './keymap';

export { inkstreamSchema };
export * from './license';

// ---------------------------------------------------------------------------
// Core builder functions (re-exported from dedicated modules)
// ---------------------------------------------------------------------------

export { buildInputRules } from './input-rules';
export { buildKeymap } from './keymap';

// ---------------------------------------------------------------------------
// Headless editor + reactive store
// ---------------------------------------------------------------------------

export { InkstreamEditor, EditorStateStore } from './editor';
export type { InkstreamEditorConfig, InkstreamEditorCallbacks } from './editor';

// ---------------------------------------------------------------------------
// Plugin system
// ---------------------------------------------------------------------------

export type { Plugin, ToolbarItem };
export type { PasteRule } from './plugins';
export type { EditorLifecycleContext, UpdateLifecycleContext, FocusLifecycleContext } from './plugins';
export { buildPastePlugin } from './paste-rules';
export { PluginManager };
export { createPlugin } from './plugins/plugin-factory';
export type { PluginContext, PluginConfig, ExtendablePlugin } from './plugins/plugin-factory';
export type { GlobalAttributeSpec, GlobalAttributeDef } from './global-attributes';
export { applyGlobalAttributes, applyGlobalAttrsToSpec } from './global-attributes';
export type { NodeViewConstructor } from '@inkstream/pm/view';

// ---------------------------------------------------------------------------
// Command API
// ---------------------------------------------------------------------------

export { CommandChain } from './commands/chain';
export type { ChainedCommands } from './commands/chain';
export type { CommandProps, CommandFunction, CommandCreator, CommandsMap } from './commands/types';

// ---------------------------------------------------------------------------
// ProseMirror helper utilities — used by plugin packages (e.g. @inkstream/lists)
// ---------------------------------------------------------------------------

export { findParentNode, getNodeType, isList } from './helpers/prosemirror';

// ---------------------------------------------------------------------------
// Convenience: build the full ProseMirror plugin array from an Inkstream
// plugin array. Used by tests and simple integrations that don't need the full
// InkstreamEditor class (no DOM required).
// ---------------------------------------------------------------------------

/**
 * Builds the complete ProseMirror plugin array from an array of Inkstream
 * plugin instances.
 *
 * Useful for testing and headless scenarios where you need the ProseMirror
 * plugin array but do not want to mount an `EditorView`.
 *
 * @example
 * ```ts
 * const pmPlugins = inkstreamPlugins(corePlugins);
 * const state = EditorState.create({ schema, plugins: pmPlugins });
 * ```
 */
export const inkstreamPlugins = (plugins: Plugin[]) => {
  const manager = new PluginManager();
  plugins.forEach(plugin => manager.registerPlugin(plugin));
  const schema = inkstreamSchema(manager);
  return [
    ...manager.getProseMirrorPlugins(schema),
    buildInputRules(schema),
    buildKeymap(schema, manager),
  ];
};