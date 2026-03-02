
import { createPlugin } from '@inkstream/editor-core';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { setBlockType } from 'prosemirror-commands';
import { ToolbarItem } from '@inkstream/editor-core';

export const headingPlugin = createPlugin({
  name: 'heading',

  getKeymap: (schema: Schema): { [key: string]: any } => {
    const keys: { [key: string]: any } = {};
    if (schema.nodes.heading) {
      keys['Ctrl-Alt-1'] = setBlockType(schema.nodes.heading, { level: 1 });
    }
    return keys;
  },

  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    const items: ToolbarItem[] = [];

    if (schema.nodes.heading) {
      items.push({
        id: 'heading',
        icon: 'H',
        tooltip: 'Headings',
        type: 'dropdown',
        children: [
          {
            id: 'paragraph',
            icon: 'Paragraph',
            tooltip: 'Paragraph',
            command: setBlockType(schema.nodes.paragraph),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.hasMarkup(schema.nodes.paragraph);
            },
          },
          {
            id: 'heading1',
            icon: 'Heading 1',
            tooltip: 'Heading 1',
            command: setBlockType(schema.nodes.heading, { level: 1 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.hasMarkup(schema.nodes.heading, { level: 1 });
            },
          },
          {
            id: 'heading2',
            icon: 'Heading 2',
            tooltip: 'Heading 2',
            command: setBlockType(schema.nodes.heading, { level: 2 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.hasMarkup(schema.nodes.heading, { level: 2 });
            },
          },
          {
            id: 'heading3',
            icon: 'Heading 3',
            tooltip: 'Heading 3',
            command: setBlockType(schema.nodes.heading, { level: 3 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.hasMarkup(schema.nodes.heading, { level: 3 });
            },
          },
          {
            id: 'heading4',
            icon: 'Heading 4',
            tooltip: 'Heading 4',
            command: setBlockType(schema.nodes.heading, { level: 4 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.hasMarkup(schema.nodes.heading, { level: 4 });
            },
          },
          {
            id: 'heading5',
            icon: 'Heading 5',
            tooltip: 'Heading 5',
            command: setBlockType(schema.nodes.heading, { level: 5 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.hasMarkup(schema.nodes.heading, { level: 5 });
            },
          },
          {
            id: 'heading6',
            icon: 'Heading 6',
            tooltip: 'Heading 6',
            command: setBlockType(schema.nodes.heading, { level: 6 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.hasMarkup(schema.nodes.heading, { level: 6 });
            },
          },
        ],
      });
    }

    return items;
  },
});
