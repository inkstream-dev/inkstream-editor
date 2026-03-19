import { Schema } from '@inkstream/pm/model';
import { EditorState, Transaction } from '@inkstream/pm/state';
import { keymap } from '@inkstream/pm/keymap';
import { baseKeymap, splitBlock, chainCommands } from '@inkstream/pm/commands';
import { splitListItem, liftListItem } from '@inkstream/pm/schema-list';
import { PluginManager } from './plugins';

/**
 * Builds the full keymap for Inkstream.
 *
 * Layers:
 * 1. ProseMirror's `baseKeymap` (Backspace, Enter, ArrowLeft/Right, etc.)
 * 2. Keymaps contributed by each registered plugin via `getKeymap(schema)`
 * 3. Built-in overrides:
 *    - `Shift-Enter` → hard break
 *    - `Enter` → smart list-item split/lift, then default split-block
 */
export const buildKeymap = (schema: Schema, manager: PluginManager) => {
  const keys: { [key: string]: any } = {};

  Object.assign(keys, baseKeymap);

  manager.getPlugins().forEach(plugin => {
    const pluginKeymap = plugin.getKeymap?.(schema);
    if (pluginKeymap) {
      Object.assign(keys, pluginKeymap);
    }
  });

  if (schema.nodes.hard_break) {
    keys['Shift-Enter'] = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
      if (dispatch) {
        dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView());
      }
      return true;
    };
  }

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
  keys['Enter'] = chainCommands(...enterCommands);

  return keymap(keys);
};
