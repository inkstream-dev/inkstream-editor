import { createPlugin } from './plugin-factory';
import { Schema } from '@inkstream/pm/model';
import { keymap } from '@inkstream/pm/keymap';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction, TextSelection } from '@inkstream/pm/state';
import { ToolbarItem } from './index';
import { exitCode, chainCommands, newlineInCode, setBlockType } from '@inkstream/pm/commands';

// ---------------------------------------------------------------------------
// SVG icon — </> symbol, stroke-based, scales cleanly with currentColor
// ---------------------------------------------------------------------------
const svgCodeBlock = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="5,3 2,8 5,13"/>
  <polyline points="11,3 14,8 11,13"/>
  <line x1="9.5" y1="3" x2="6.5" y2="13"/>
</svg>`;

// ---------------------------------------------------------------------------
// Keyboard handlers
// ---------------------------------------------------------------------------

/**
 * When Enter is pressed and the current paragraph contains exactly "```",
 * convert it to an empty code block (handles the ``` + Enter trigger;
 * the ``` + Space trigger is covered by the input rule in buildInputRules).
 */
const turnIntoCodeBlockOnEnter = (
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
): boolean => {
  const { $from } = state.selection;
  const node = $from.parent;
  if (node.type.name !== 'paragraph' || node.textContent !== '```') return false;
  if (dispatch) {
    const codeBlock = state.schema.nodes.code_block.create();
    dispatch(state.tr.replaceWith($from.before(), $from.after(), codeBlock).scrollIntoView());
  }
  return true;
};

/**
 * Triple-Enter exit: when the cursor is at the very end of a code block and
 * the last two characters are consecutive newlines (\n\n), the user has pressed
 * Enter twice on an empty trailing line.  A third Enter press here removes both
 * trailing newlines and moves focus into a new paragraph after the code block.
 *
 * Conditions (all must be true):
 *   1. Selection is collapsed.
 *   2. Cursor is inside a code_block.
 *   3. Cursor is at the end of the code block (no content after it).
 *   4. The last two characters of the block's text are "\n\n".
 *
 * Position arithmetic (no hardcoded offsets):
 *   - Delete [$from.pos - 2, $from.pos]  (the two trailing newlines).
 *   - Map $from.after() through the transaction to get the new position
 *     immediately after the (now shorter) code block node.
 *   - Insert an empty paragraph at that mapped position.
 *   - Place cursor at mapped_pos + 1  (the first writable position inside
 *     the new paragraph).
 */
const smartExitCodeBlock = (
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
): boolean => {
  if (!state.selection.empty) return false;

  const { $from } = state.selection;
  if ($from.parent.type.name !== 'code_block') return false;

  // Cursor must be at the very end of the code block
  if ($from.pos !== $from.end()) return false;

  // Bail if paragraph node isn't in the schema (defensive)
  if (!state.schema.nodes.paragraph) return false;

  // Check that the last two characters are \n\n
  const text = $from.parent.textContent;
  if (text.length < 2 || text.slice(-2) !== '\n\n') return false;

  if (dispatch) {
    const tr = state.tr;
    // 1. Delete the two trailing newlines
    tr.delete($from.pos - 2, $from.pos);
    // 2. Compute position after the code block node (accounting for the deletion)
    const afterBlock = tr.mapping.map($from.after());
    // 3. Insert a new empty paragraph immediately after the code block
    tr.insert(afterBlock, state.schema.nodes.paragraph.create());
    // 4. Place cursor inside the new paragraph
    tr.setSelection(TextSelection.create(tr.doc, afterBlock + 1));
    dispatch(tr.scrollIntoView());
  }
  return true;
};

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------
export const codeBlockPlugin = createPlugin({
  name: 'codeBlock',

  nodes: {
    code_block: {
      content: 'text*',
      marks: '',
      group: 'block',
      code: true,
      defining: true,
      parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
      toDOM() {
        return ['pre', { class: 'inkstream-code-block' }, ['code', 0]];
      },
    },
  },

  getProseMirrorPlugins: (_schema: Schema): ProseMirrorPlugin[] => {
    return [
      keymap({
        // Chain order matters:
        //   turnIntoCodeBlockOnEnter — only fires when paragraph text is "```"
        //   smartExitCodeBlock       — only fires at end of block with \n\n tail
        //   newlineInCode            — normal Enter inside a code block
        'Enter': chainCommands(turnIntoCodeBlockOnEnter, smartExitCodeBlock, newlineInCode),
        // exitCode exits to a new paragraph below; has higher priority than
        // buildKeymap's hard-break handler because this plugin is registered first.
        'Shift-Enter': exitCode,
      }),
    ];
  },

  // Note: the ``` + Space input rule lives in buildInputRules (index.ts).
  // getInputRules is intentionally absent here to avoid a duplicate rule.

  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'codeBlock',
        icon: '',        // visual rendered via iconHtml below
        iconHtml: svgCodeBlock,
        tooltip: 'Code Block',
        command: (state: EditorState, dispatch?: (tr: Transaction) => void) => {
          const isActive = state.selection.$from.parent.type === schema.nodes.code_block;

          if (isActive) {
            // Toggle off: convert back to a plain paragraph
            return setBlockType(schema.nodes.paragraph)(state, dispatch);
          }

          // Toggle on: wrap selection (or insert empty block) as code
          const { from, to } = state.selection;
          let textContent = '';
          let codeBlock;

          if (state.selection.empty) {
            codeBlock = schema.nodes.code_block.create();
          } else {
            textContent = state.doc.textBetween(from, to, '\n');
            codeBlock = schema.nodes.code_block.create(null, schema.text(textContent));
          }

          const tr = state.tr.replaceSelectionWith(codeBlock);
          const newSel = TextSelection.create(
            tr.doc,
            from + 1,
            from + 1 + textContent.length,
          );
          if (dispatch) dispatch(tr.setSelection(newSel).scrollIntoView());
          return true;
        },
        isActive: (state: EditorState) =>
          state.selection.$from.parent.type === schema.nodes.code_block,
      },
    ];
  },
});

