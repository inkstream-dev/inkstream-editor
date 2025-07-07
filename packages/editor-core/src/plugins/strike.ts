import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { toggleMark } from 'prosemirror-commands';
import { ToolbarItem } from './index';
import { TextSelection } from 'prosemirror-state';

export const strikePlugin = createPlugin({
  name: 'strike',
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const plugins: ProseMirrorPlugin[] = [];

    // Keymap for strike (Ctrl+Shift+S or Cmd+Shift+S)
    const keys: { [key: string]: any } = {};
    keys["Mod-Shift-s"] = toggleMark(schema.marks.strike);
    plugins.push(keymap(keys));

    return plugins;
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'strike',
        icon: 'S',
        tooltip: 'Strikethrough',
        command: toggleMark(schema.marks.strike),
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          if (empty) {
            // Check if the mark is active at the cursor position
            if (state.selection instanceof TextSelection) {
              const $cursor = state.selection.$cursor;
              if ($cursor) {
                return !!schema.marks.strike.isInSet($cursor.marks() || []);
              }
            }
            return !!schema.marks.strike.isInSet(state.storedMarks || []);
          } else {
            // Check if the mark is active within the selection range
            return state.doc.rangeHasMark(from, to, schema.marks.strike);
          }
        },
      },
    ];
  },
});