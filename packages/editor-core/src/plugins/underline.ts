import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { toggleMark } from 'prosemirror-commands';
import { ToolbarItem } from './index';
import { TextSelection } from 'prosemirror-state';

export const underlinePlugin = createPlugin({
  name: 'underline',
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const plugins: ProseMirrorPlugin[] = [];

    // Keymap for underline (Ctrl+U or Cmd+U)
    const keys: { [key: string]: any } = {};
    keys["Mod-u"] = toggleMark(schema.marks.underline);
    plugins.push(keymap(keys));

    return plugins;
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'underline',
        icon: 'U',
        tooltip: 'Underline',
        command: toggleMark(schema.marks.underline),
        isActive: (state: EditorState) => {
          const { from, to, empty } = state.selection;
          if (empty) {
            // Check if the mark is active at the cursor position
            if (state.selection instanceof TextSelection) {
              const $cursor = state.selection.$cursor;
              if ($cursor) {
                return !!schema.marks.underline.isInSet($cursor.marks() || []);
              }
            }
            return !!schema.marks.underline.isInSet(state.storedMarks || []);
          } else {
            // Check if the mark is active within the selection range
            return state.doc.rangeHasMark(from, to, schema.marks.underline);
          }
        },
      },
    ];
  },
});