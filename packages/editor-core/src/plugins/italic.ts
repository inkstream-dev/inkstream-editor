import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { toggleMark } from 'prosemirror-commands';
import { Plugin, ToolbarItem } from '../plugins';
import { TextSelection } from 'prosemirror-state';

export const italicPlugin: Plugin = {
  name: 'italic',
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const plugins: ProseMirrorPlugin[] = [];

    // Keymap for italic (Ctrl+I or Cmd+I)
    const keys: { [key: string]: any } = {};
    keys["Mod-i"] = toggleMark(schema.marks.em);
    plugins.push(keymap(keys));

    return plugins;
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'italic',
        icon: 'I',
        tooltip: 'Italic',
        command: toggleMark(schema.marks.em),
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          if (empty) {
            // Check if the mark is active at the cursor position
            if (state.selection instanceof TextSelection) {
              const $cursor = state.selection.$cursor;
              if ($cursor) {
                return !!schema.marks.em.isInSet($cursor.marks() || []);
              }
            }
            return !!schema.marks.em.isInSet(state.storedMarks || []);
          } else {
            // Check if the mark is active within the selection range
            return state.doc.rangeHasMark(from, to, schema.marks.em);
          }
        },
      },
    ];
  },
};