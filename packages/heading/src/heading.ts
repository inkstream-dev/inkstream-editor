
import { createPlugin } from '@inkstream/editor-core';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { setBlockType } from 'prosemirror-commands';
import { ToolbarItem } from '@inkstream/editor-core';

// Professional "H" with subscript numeral icon — matches toolbar icon family (14×14, stroke-based)
const HEADING_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="2" y1="2.5" x2="2" y2="11.5"/>
  <line x1="2" y1="7" x2="8" y2="7"/>
  <line x1="8" y1="2.5" x2="8" y2="11.5"/>
  <line x1="11" y1="6" x2="11" y2="11.5"/>
  <line x1="10" y1="7" x2="11" y2="6"/>
</svg>`;

// Paragraph pilcrow icon for dropdown
const PARAGRAPH_ICON = `<span style="font-size:15px;line-height:1;display:inline-block">¶</span>`;

// Heading level indicator for dropdown items — size decreases with level for visual hierarchy
const headingIcon = (level: number): string => {
  const size = Math.max(10, 16 - level * 2);
  return `<span style="font-size:${size}px;font-weight:700;line-height:1;font-family:inherit;display:inline-block;min-width:20px">H${level}</span>`;
};

export const headingPlugin = createPlugin({
  name: 'heading',

  getKeymap: (schema: Schema): { [key: string]: any } => {
    const keys: { [key: string]: any } = {};
    if (schema.nodes.paragraph) {
      // Mod = Cmd on macOS, Ctrl on Windows/Linux
      keys['Mod-Alt-0'] = setBlockType(schema.nodes.paragraph);
    }
    if (schema.nodes.heading) {
      for (let level = 1; level <= 6; level++) {
        keys[`Mod-Alt-${level}`] = setBlockType(schema.nodes.heading, { level });
      }
    }
    return keys;
  },

  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    const items: ToolbarItem[] = [];

    if (schema.nodes.heading) {
      items.push({
        id: 'heading',
        iconHtml: HEADING_ICON_SVG,
        tooltip: 'Text style',
        type: 'dropdown',
        isActive: (state: EditorState) => {
          const { $from } = state.selection;
          return $from.parent.type === schema.nodes.heading;
        },
        children: [
          {
            id: 'paragraph',
            iconHtml: PARAGRAPH_ICON,
            label: 'Normal text',
            tooltip: 'Normal text (Mod+Alt+0)',
            command: setBlockType(schema.nodes.paragraph),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.hasMarkup(schema.nodes.paragraph);
            },
          },
          {
            id: 'heading1',
            iconHtml: headingIcon(1),
            label: 'Heading 1',
            tooltip: 'Heading 1 (Mod+Alt+1)',
            command: setBlockType(schema.nodes.heading, { level: 1 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.type === schema.nodes.heading && $from.parent.attrs['level'] === 1;
            },
          },
          {
            id: 'heading2',
            iconHtml: headingIcon(2),
            label: 'Heading 2',
            tooltip: 'Heading 2 (Mod+Alt+2)',
            command: setBlockType(schema.nodes.heading, { level: 2 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.type === schema.nodes.heading && $from.parent.attrs['level'] === 2;
            },
          },
          {
            id: 'heading3',
            iconHtml: headingIcon(3),
            label: 'Heading 3',
            tooltip: 'Heading 3 (Mod+Alt+3)',
            command: setBlockType(schema.nodes.heading, { level: 3 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.type === schema.nodes.heading && $from.parent.attrs['level'] === 3;
            },
          },
          {
            id: 'heading4',
            iconHtml: headingIcon(4),
            label: 'Heading 4',
            tooltip: 'Heading 4 (Mod+Alt+4)',
            command: setBlockType(schema.nodes.heading, { level: 4 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.type === schema.nodes.heading && $from.parent.attrs['level'] === 4;
            },
          },
          {
            id: 'heading5',
            iconHtml: headingIcon(5),
            label: 'Heading 5',
            tooltip: 'Heading 5 (Mod+Alt+5)',
            command: setBlockType(schema.nodes.heading, { level: 5 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.type === schema.nodes.heading && $from.parent.attrs['level'] === 5;
            },
          },
          {
            id: 'heading6',
            iconHtml: headingIcon(6),
            label: 'Heading 6',
            tooltip: 'Heading 6 (Mod+Alt+6)',
            command: setBlockType(schema.nodes.heading, { level: 6 }),
            isActive: (state: EditorState) => {
              const { $from } = state.selection;
              return $from.parent.type === schema.nodes.heading && $from.parent.attrs['level'] === 6;
            },
          },
        ],
      });
    }

    return items;
  },
});
