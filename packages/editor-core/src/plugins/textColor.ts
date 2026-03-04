import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { ToolbarItem } from './index';

// ---------------------------------------------------------------------------
// Default color palette — configurable via pluginOptions.textColor.palette
// ---------------------------------------------------------------------------
export interface ColorEntry {
  label: string;
  value: string;
}

export const DEFAULT_TEXT_COLOR_PALETTE: ColorEntry[] = [
  // Neutrals
  { label: 'Black',      value: '#000000' },
  { label: 'Dark Gray',  value: '#374151' },
  { label: 'Gray',       value: '#6B7280' },
  { label: 'Light Gray', value: '#9CA3AF' },
  // Warm
  { label: 'Red',        value: '#EF4444' },
  { label: 'Orange',     value: '#F97316' },
  { label: 'Amber',      value: '#F59E0B' },
  { label: 'Yellow',     value: '#EAB308' },
  // Cool
  { label: 'Green',      value: '#22C55E' },
  { label: 'Teal',       value: '#14B8A6' },
  { label: 'Blue',       value: '#3B82F6' },
  { label: 'Indigo',     value: '#6366F1' },
  // Soft / pastel
  { label: 'Purple',     value: '#8B5CF6' },
  { label: 'Pink',       value: '#EC4899' },
  { label: 'Light Blue', value: '#93C5FD' },
  { label: 'Light Green',value: '#86EFAC' },
];

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

// Letter "A" outline — underline bar is rendered dynamically as activeColor indicator
const svgTextColor = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3.5 12.5 L8 3 L12.5 12.5"/>
  <line x1="5.5" y1="8.5" x2="10.5" y2="8.5"/>
</svg>`;

// ---------------------------------------------------------------------------
// Module-level last-used tracker — scoped to this plugin module only
// ---------------------------------------------------------------------------
let lastUsedTextColor: string | null = null;

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
export function setTextColor(color: string) {
  return function (state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
    const { from, to } = state.selection;
    const markType = state.schema.marks.textColor;
    if (!markType) return false;

    if (dispatch) {
      let tr = state.tr;
      // Clear existing textColor marks in the selection
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.isText) {
          node.marks.forEach(mark => {
            if (mark.type === markType) {
              tr = tr.removeMark(pos, pos + node.nodeSize, mark);
            }
          });
        }
      });
      tr = tr.addMark(from, to, markType.create({ color }));
      dispatch(tr);
    }
    return true;
  };
}

/** Remove all textColor marks from the current selection. */
export function removeTextColor(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { from, to } = state.selection;
  const markType = state.schema.marks.textColor;
  if (!markType) return false;

  // Only proceed if there's actually a textColor mark in the range
  if (!state.doc.rangeHasMark(from, to, markType)) return false;

  if (dispatch) {
    dispatch(state.tr.removeMark(from, to, markType));
  }
  return true;
}

/** Apply color and record it as last-used. */
function applyColor(color: string) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    lastUsedTextColor = color;
    return setTextColor(color)(state, dispatch);
  };
}

// ---------------------------------------------------------------------------
// Active-color helper (reads color from cursor / selection)
// ---------------------------------------------------------------------------
function getActiveTextColor(state: EditorState): string | null {
  const markType = state.schema.marks.textColor;
  if (!markType) return null;

  const { empty, from, to } = state.selection;

  if (empty) {
    const marks =
      state.selection instanceof TextSelection && state.selection.$cursor
        ? state.selection.$cursor.marks()
        : state.storedMarks ?? [];
    const mark = markType.isInSet(marks ?? []);
    return mark ? (mark.attrs.color as string) : null;
  }

  // Range selection: return color only when the whole range shares the same color
  let color: string | null | undefined;
  state.doc.nodesBetween(from, to, node => {
    if (!node.isText) return;
    const mark = markType.isInSet(node.marks);
    const c = mark ? (mark.attrs.color as string) : null;
    if (color === undefined) {
      color = c;
    } else if (color !== c) {
      color = null; // mixed — show neutral
      return false; // stop traversal
    }
  });
  return color ?? null;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
export const textColorPlugin = createPlugin({
  name: 'textColor',

  marks: {
    textColor: {
      attrs: { color: { default: 'black' } },
      inline: true,
      group: 'inline',
      parseDOM: [{
        style: 'color',
        getAttrs: (value: string | HTMLElement) =>
          typeof value === 'string' ? { color: value } : null,
      }],
      toDOM: (mark: any) => ['span', { style: `color: ${mark.attrs.color}` }, 0],
    },
  },

  getProseMirrorPlugins: (_schema: Schema): ProseMirrorPlugin[] => [],

  getToolbarItems: (_schema: Schema, options: any = {}): ToolbarItem[] => {
    const palette: ColorEntry[] =
      options?.palette ?? DEFAULT_TEXT_COLOR_PALETTE;

    // Circular color swatch via iconHtml — CSS handles shape, size, hover/active ring
    const swatchItems: ToolbarItem[] = palette.map(({ label, value }) => ({
      id: `textColor-swatch-${value.replace('#', '')}`,
      iconHtml: `<span class="inkstream-color-swatch" style="background:${value}" aria-label="${label}"></span>`,
      tooltip: label,
      command: applyColor(value),
      isActive: (state: EditorState) => getActiveTextColor(state) === value,
    }));

    return [
      {
        id: 'textColor',
        iconHtml: svgTextColor,
        tooltip: 'Text Color',
        type: 'dropdown',
        childrenLayout: 'grid',

        // Reads live cursor/selection color to show underline indicator on button
        getActiveColor: getActiveTextColor,

        // Called each time the dropdown renders — inserts the last-used row dynamically
        getChildren: (_state: EditorState): ToolbarItem[] => {
          const items: ToolbarItem[] = [];

          if (lastUsedTextColor) {
            items.push({
              id: 'textColor-label-recent',
              type: 'label',
              label: 'Recently used',
              tooltip: '',
            });
            items.push({
              id: 'textColor-last-used',
              iconHtml: `<span class="inkstream-color-swatch" style="background:${lastUsedTextColor}" aria-label="Last used"></span>`,
              tooltip: `Last used: ${lastUsedTextColor}`,
              command: applyColor(lastUsedTextColor),
              isActive: (state: EditorState) => getActiveTextColor(state) === lastUsedTextColor,
            });
            // Separator before main palette
            items.push({ id: 'textColor-sep-last', icon: '|', tooltip: '' });
          }

          items.push(...swatchItems);

          // Separator before custom picker
          items.push({ id: 'textColor-sep-custom', icon: '|', tooltip: '' });

          items.push({
            id: 'textColor-custom',
            tooltip: 'Custom color',
            type: 'color-picker',
            onColorChange: (color: string) => applyColor(color),
          });

          return items;
        },

        isActive: (state: EditorState) => getActiveTextColor(state) !== null,
      },
    ];
  },
});

