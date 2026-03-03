import { Schema } from 'prosemirror-model';
import {
  EditorState,
  Transaction,
  TextSelection,
  Plugin as ProseMirrorPlugin,
} from 'prosemirror-state';
import { inputRules, InputRule } from 'prosemirror-inputrules';
import { createPlugin } from './plugin-factory';
import { ToolbarItem } from './index';

// ---------------------------------------------------------------------------
// Option types
// ---------------------------------------------------------------------------
export interface DividerOptions {
  /** Border thickness (default: '1px') */
  thickness?: string;
  /** Border style: solid | dashed | dotted (default: 'solid') */
  style?: 'solid' | 'dashed' | 'dotted';
  /** Border color (default: '#e2e8f0') */
  color?: string;
  /** Vertical margin (default: '1.5em 0') */
  margin?: string;
  /** Additional CSS class injected on the <hr> element */
  customClass?: string;
}

function resolveAttrs(options?: DividerOptions) {
  return {
    thickness:   options?.thickness   ?? null,
    borderStyle: options?.style       ?? null,
    color:       options?.color       ?? null,
    margin:      options?.margin      ?? null,
    customClass: options?.customClass ?? null,
  };
}

// ---------------------------------------------------------------------------
// insertDivider — the single public command
// ---------------------------------------------------------------------------
export function insertDivider(
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
  options?: DividerOptions
): boolean {
  const hrType = state.schema.nodes.horizontal_rule;
  if (!hrType) return false;

  const hrNode = hrType.create(resolveAttrs(options));
  let tr = state.tr.replaceSelectionWith(hrNode);

  if (dispatch) {
    const { $to } = tr.selection;

    if ($to.nodeAfter) {
      // A block already follows the hr — move cursor into it
      tr = tr.setSelection(TextSelection.create(tr.doc, $to.pos + 1));
    } else {
      // Hr is at the end of its container — append a blank paragraph
      const paraType = state.schema.nodes.paragraph;
      if (paraType) {
        tr = tr.insert($to.pos, paraType.create());
        tr = tr.setSelection(TextSelection.create(tr.doc, $to.pos + 1));
      }
    }

    dispatch(tr.scrollIntoView());
  }
  return true;
}

// ---------------------------------------------------------------------------
// Input-rule builder — returns the `---` → hr rule
// ---------------------------------------------------------------------------
function buildDividerInputRule(schema: Schema): InputRule | null {
  const hrType = schema.nodes.horizontal_rule;
  const paraType = schema.nodes.paragraph;
  if (!hrType || !paraType) return null;

  // Fires when the entire textblock content becomes exactly `---`
  return new InputRule(/^---$/, (state, _match, start, end) => {
    const $start = state.doc.resolve(start);

    // Only fire inside a plain paragraph (not inside code_block, blockquote, etc.)
    if ($start.parent.type.name !== 'paragraph') return null;

    // Replace the whole paragraph (from before its opening tag to after its closing tag)
    const replaceFrom = $start.before($start.depth);
    const replaceTo   = $start.after($start.depth);

    const hr   = hrType.create();
    const para = paraType.create();

    let tr = state.tr.replaceWith(replaceFrom, replaceTo, [hr, para]);
    // Cursor inside the new empty paragraph (replaceFrom + 1 = inside hr is invalid,
    // replaceFrom + 2 = inside the paragraph that follows)
    tr = tr.setSelection(TextSelection.create(tr.doc, replaceFrom + 2));
    return tr;
  });
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------
export const horizontalLinePlugin = createPlugin({
  name: 'horizontalLine',

  nodes: {
    horizontal_rule: {
      group: 'block',
      attrs: {
        /** px / em / rem string, default applied via CSS */
        thickness:   { default: null },
        borderStyle: { default: null },
        color:       { default: null },
        margin:      { default: null },
        customClass: { default: null },
      },
      parseDOM: [{
        tag: 'hr',
        getAttrs(dom: HTMLElement | string) {
          const el = dom as HTMLElement;
          return {
            thickness:   el.style.borderTopWidth  || null,
            borderStyle: el.style.borderTopStyle  || null,
            color:       el.style.borderTopColor  || null,
            margin:      el.style.margin          || null,
            customClass: el.getAttribute('data-class') || null,
          };
        },
      }],
      toDOM(node: { attrs: Record<string, string | null> }) {
        const { thickness, borderStyle, color, margin, customClass } = node.attrs;
        const t   = thickness   || '1px';
        const s   = borderStyle || 'solid';
        const c   = color       || '#e2e8f0';
        const m   = margin      || '1.5em 0';
        const attrs: Record<string, string> = {
          style: `border: none; border-top: ${t} ${s} ${c}; margin: ${m};`,
          class: ['inkstream-divider', customClass].filter(Boolean).join(' '),
        };
        if (customClass) attrs['data-class'] = customClass;
        return ['hr', attrs];
      },
    },
  },

  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const rule = buildDividerInputRule(schema);
    return rule ? [inputRules({ rules: [rule] })] : [];
  },

  getToolbarItems: (schema: Schema, options?: DividerOptions): ToolbarItem[] => [{
    id: 'horizontalLine',
    icon: '─',
    tooltip: 'Insert Divider (Ctrl+Shift+H)',
    command: (state, dispatch) => insertDivider(state, dispatch, options),
    // No isActive — dividers are not togglable
  }],

  getKeymap: (schema: Schema) => ({
    'Mod-Shift-h': (state: EditorState, dispatch?: (tr: Transaction) => void) =>
      insertDivider(state, dispatch),
  }),
});
