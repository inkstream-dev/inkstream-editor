import { createPlugin } from './plugin-factory';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { ToolbarItem } from './index';

// ---------------------------------------------------------------------------
// Default highlight palette — soft pastel tones, configurable via pluginOptions
// ---------------------------------------------------------------------------
export interface HighlightColorEntry {
  label: string;
  value: string;
}

export const DEFAULT_HIGHLIGHT_PALETTE: HighlightColorEntry[] = [
  { label: 'Yellow',  value: '#FEF08A' },
  { label: 'Amber',   value: '#FDE68A' },
  { label: 'Orange',  value: '#FED7AA' },
  { label: 'Pink',    value: '#FBCFE8' },
  { label: 'Red',     value: '#FECACA' },
  { label: 'Purple',  value: '#E9D5FF' },
  { label: 'Indigo',  value: '#C7D2FE' },
  { label: 'Blue',    value: '#BFDBFE' },
  { label: 'Cyan',    value: '#A5F3FC' },
  { label: 'Teal',    value: '#99F6E4' },
  { label: 'Green',   value: '#BBF7D0' },
  { label: 'Gray',    value: '#E5E7EB' },
];

// ---------------------------------------------------------------------------
// Module-level last-used tracker — scoped to this plugin module only
// ---------------------------------------------------------------------------
let lastUsedHighlightColor: string | null = null;

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** Apply a background-color highlight mark, replacing any existing highlight. */
export function setHighlight(color: string) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const markType = state.schema.marks.highlight;
    if (!markType) return false;

    if (dispatch) {
      const { from, to } = state.selection;
      let tr = state.tr;
      // Remove existing highlight marks in selection
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.isText) {
          node.marks.forEach(mark => {
            if (mark.type === markType) {
              tr = tr.removeMark(pos, pos + node.nodeSize, mark);
            }
          });
        }
      });
      tr = tr.addMark(from, to, markType.create({ backgroundColor: color }));
      dispatch(tr);
    }
    return true;
  };
}

/** Remove all highlight marks from the selection. */
export const unsetHighlight = (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
  const markType = state.schema.marks.highlight;
  if (!markType) return false;
  if (dispatch) {
    const { from, to } = state.selection;
    dispatch(state.tr.removeMark(from, to, markType));
  }
  return true;
};

/** Apply color (or toggle off if selection already has that exact color). */
function applyOrToggleHighlight(color: string) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const active = getActiveHighlightColor(state);
    if (active === color) {
      return unsetHighlight(state, dispatch);
    }
    lastUsedHighlightColor = color;
    return setHighlight(color)(state, dispatch);
  };
}

// ---------------------------------------------------------------------------
// Active-color helper
// ---------------------------------------------------------------------------
function getActiveHighlightColor(state: EditorState): string | null {
  const markType = state.schema.marks.highlight;
  if (!markType) return null;

  const { empty, from, to } = state.selection;

  if (empty) {
    const marks =
      state.selection instanceof TextSelection && state.selection.$cursor
        ? state.selection.$cursor.marks()
        : state.storedMarks ?? [];
    const mark = markType.isInSet(marks ?? []);
    return mark ? (mark.attrs.backgroundColor as string) : null;
  }

  // Range: return color only when the entire range shares the same highlight
  let color: string | null | undefined;
  state.doc.nodesBetween(from, to, node => {
    if (!node.isText) return;
    const mark = markType.isInSet(node.marks);
    const c = mark ? (mark.attrs.backgroundColor as string) : null;
    if (color === undefined) {
      color = c;
    } else if (color !== c) {
      color = null;
      return false;
    }
  });
  return color ?? null;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
export const highlightPlugin = createPlugin({
  name: 'highlight',

  marks: {
    highlight: {
      attrs: { backgroundColor: { default: 'yellow' } },
      inline: true,
      group: 'inline',
      parseDOM: [{
        style: 'background-color',
        getAttrs: (value: string | HTMLElement) =>
          typeof value === 'string' ? { backgroundColor: value } : null,
      }],
      toDOM: (mark: any) => ['span', { style: `background-color: ${mark.attrs.backgroundColor}` }, 0],
    },
  },

  getProseMirrorPlugins: (_schema: Schema): ProseMirrorPlugin[] => [],

  getToolbarItems: (_schema: Schema, options: any = {}): ToolbarItem[] => {
    const palette: HighlightColorEntry[] =
      options?.palette ?? DEFAULT_HIGHLIGHT_PALETTE;

    const swatchItems: ToolbarItem[] = palette.map(({ label, value }) => ({
      id: `highlight-swatch-${value.replace('#', '')}`,
      icon: '■',
      iconStyle: { color: value, filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.4))' },
      tooltip: label,
      command: applyOrToggleHighlight(value),
      isActive: (state: EditorState) => getActiveHighlightColor(state) === value,
    }));

    return [
      {
        id: 'highlight',
        icon: 'H',
        tooltip: 'Highlight',
        type: 'dropdown',
        childrenLayout: 'grid',

        getActiveColor: getActiveHighlightColor,

        getChildren: (_state: EditorState): ToolbarItem[] => {
          const items: ToolbarItem[] = [];

          if (lastUsedHighlightColor) {
            items.push({
              id: 'highlight-last-used',
              icon: '■',
              iconStyle: { color: lastUsedHighlightColor, filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.4))' },
              tooltip: `Last used: ${lastUsedHighlightColor}`,
              command: applyOrToggleHighlight(lastUsedHighlightColor),
            });
            items.push({ id: 'highlight-sep-last', icon: '|', tooltip: '' });
          }

          items.push(...swatchItems);

          items.push({ id: 'highlight-sep-actions', icon: '|', tooltip: '' });

          items.push({
            id: 'highlight-remove',
            icon: '✕ Remove',
            tooltip: 'Remove Highlight',
            command: unsetHighlight,
          });

          items.push({ id: 'highlight-sep-custom', icon: '|', tooltip: '' });

          items.push({
            id: 'highlight-custom',
            icon: '🎨 Custom…',
            tooltip: 'Custom Highlight Color',
            type: 'color-picker',
            onColorChange: (color: string) => applyOrToggleHighlight(color),
          });

          return items;
        },

        isActive: (state: EditorState) => getActiveHighlightColor(state) !== null,
      },
    ];
  },
});

