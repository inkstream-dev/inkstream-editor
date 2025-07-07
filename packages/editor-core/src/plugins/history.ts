import { Schema } from 'prosemirror-model';
import { EditorState, Plugin as ProseMirrorPlugin, Transaction } from 'prosemirror-state';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Plugin, ToolbarItem } from './';

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export const historyPlugin: Plugin = {
  name: 'history',
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const keys: { [key: string]: Command } = {
      'Mod-z': undo,
      'Mod-y': redo,
      'Mod-Shift-z': redo, // Common alternative for redo
    };

    return [
      history(),
      keymap(keys),
    ];
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
};
