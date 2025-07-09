import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { EditorState, Plugin as ProseMirrorPlugin, Transaction } from 'prosemirror-state';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { ToolbarItem } from './index';

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export const historyPlugin = createPlugin({
  name: 'history',
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    return [history()];
  },
  getKeymap: (schema: Schema): { [key: string]: any } => {
    const keys: { [key: string]: any } = {};
    keys["Mod-z"] = undo;
    keys["Mod-y"] = redo;
    keys["Shift-Mod-z"] = redo;
    return keys;
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'undo',
        icon: '↩',
        tooltip: 'Undo',
        command: undo,
        // isActive: (state: EditorState) => undo(state), // isActive for undo/redo is usually based on history state, not selection
      },
      {
        id: 'redo',
        icon: '↪',
        tooltip: 'Redo',
        command: redo,
        // isActive: (state: EditorState) => redo(state), // isActive for undo/redo is usually based on history state, not selection
      },
    ];
  },
});
