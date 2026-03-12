import { Schema } from '@inkstream/pm/model';
import { EditorState, Transaction } from '@inkstream/pm/state';
import { keymap } from '@inkstream/pm/keymap';
import { baseKeymap, splitBlock, chainCommands } from '@inkstream/pm/commands';
import { splitListItem, liftListItem } from '@inkstream/pm/schema-list';
import { inputRules, wrappingInputRule, textblockTypeInputRule, smartQuotes, emDash, ellipsis, InputRule } from '@inkstream/pm/inputrules';
import { PluginManager, Plugin, ToolbarItem } from './plugins';

import { inkstreamSchema } from './schema';
export { inkstreamSchema };
export * from './license';

// Input rules — exported for reuse by react-editor
export const buildInputRules = (schema: Schema) => {
  const rules = smartQuotes.concat(ellipsis, emDash);

  // Rule for headings (e.g., # Heading)
  if (schema.nodes.heading) {
    rules.push(textblockTypeInputRule(/^#+\s$/, schema.nodes.heading, (match) => ({ level: match[0].length - 1 })));
  }

  // Rule for blockquotes (e.g., > Quote)
  if (schema.nodes.blockquote) {
    rules.push(wrappingInputRule(/^>\s$/, schema.nodes.blockquote));
  }

  // Rule for code blocks (e.g., ``` Code)
  if (schema.nodes.code_block) {
    rules.push(textblockTypeInputRule(/^```\s$/, schema.nodes.code_block));
  }

  // Rules for bold
  if (schema.marks.strong) {
    rules.push(new InputRule(/\*\*([^*]+)\*\*$/, (state, match, start, end) => {
      const tr = state.tr;
      if (match[1]) {
        const textStart = start + match[0].indexOf(match[1]);
        const textEnd = textStart + match[1].length;
        tr.delete(textStart, textEnd);
        tr.addMark(textStart, textEnd, schema.marks.strong.create());
      }
      return tr;
    }));

    rules.push(new InputRule(/__([^_]+)__$/, (state, match, start, end) => {
      const tr = state.tr;
      if (match[1]) {
        const textStart = start + match[0].indexOf(match[1]);
        const textEnd = textStart + match[1].length;
        tr.delete(textStart, textEnd);
        tr.addMark(textStart, textEnd, schema.marks.strong.create());
      }
      return tr;
    }));
  }

  return inputRules({ rules });
};

// Keymap — exported for reuse by react-editor
export const buildKeymap = (schema: Schema, manager: PluginManager) => {
  const keys: { [key: string]: any } = {};

  // Add base keymap commands
  Object.assign(keys, baseKeymap);

  // Add keymaps from plugins
  manager.getPlugins().forEach(plugin => {
    const pluginKeymap = plugin.getKeymap?.(schema);
    if (pluginKeymap) {
      Object.assign(keys, pluginKeymap);
    }
  });

  // Add keybinding for hard breaks (Shift-Enter)
  if (schema.nodes.hard_break) {
    keys["Shift-Enter"] = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
      if (dispatch) {
        dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView());
      }
      return true;
    };
  }

  // Add keybinding for list items (Enter) — handles both plain and task list items
  const enterCommands: Array<(state: EditorState, dispatch?: (tr: Transaction) => void) => boolean> = [];
  if (schema.nodes.list_item) {
    enterCommands.push(splitListItem(schema.nodes.list_item));
    enterCommands.push(liftListItem(schema.nodes.list_item));
  }
  if (schema.nodes.task_item) {
    enterCommands.push(splitListItem(schema.nodes.task_item));
    enterCommands.push(liftListItem(schema.nodes.task_item));
  }
  enterCommands.push(splitBlock);
  keys["Enter"] = chainCommands(...enterCommands);

  return keymap(keys);
};

// Export all available plugins for consumers to use
// These are now in @inkstream/starter-kit. Use that package for plugin instances.

/**
 * Creates ProseMirror plugins from a given array of Inkstream plugins
 * @param plugins - Array of Plugin instances to use
 * @returns Array of ProseMirror plugins configured with the schema
 */
export const inkstreamPlugins = (plugins: Plugin[]) => {
  // Create a plugin manager instance for this specific set of plugins
  const manager = new PluginManager();
  plugins.forEach(plugin => manager.registerPlugin(plugin));
  
  const schema = inkstreamSchema(manager);

  return [
    ...manager.getProseMirrorPlugins(schema),
    buildInputRules(schema),
    buildKeymap(schema, manager),
  ];
};

export type { Plugin, ToolbarItem };
export type { PasteRule } from './plugins';
export type { EditorLifecycleContext, UpdateLifecycleContext, FocusLifecycleContext } from './plugins';
export { buildPastePlugin } from './paste-rules';
export { PluginManager };
export { createPlugin } from './plugins/plugin-factory';
export type { PluginContext, PluginConfig } from './plugins/plugin-factory';
export { CommandChain } from './commands/chain';
export type { ChainedCommands } from './commands/chain';
export type { CommandProps, CommandFunction, CommandCreator, CommandsMap } from './commands/types';

// ProseMirror helper utilities — needed by plugin packages (e.g. @inkstream/lists)
export { findParentNode, getNodeType, isList } from './helpers/prosemirror';