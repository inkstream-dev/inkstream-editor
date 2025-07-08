import { Schema } from 'prosemirror-model';
import { EditorState, Transaction, Selection, Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { createPlugin } from './plugin-factory';
import { ToolbarItem } from './index';

export const insertHorizontalLine = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  const { schema } = state;
  const node = schema.nodes.horizontal_rule.create();
  let tr = state.tr.replaceSelectionWith(node);

  // The selection's anchor is now immediately after the inserted HR node.
  const posAfterHr = tr.selection.anchor;

  // Insert a new paragraph after the horizontal rule.
  // This will place the paragraph at posAfterHr.
  tr = tr.insert(posAfterHr, schema.nodes.paragraph.create());

  // Set the selection to the start of the newly inserted paragraph.
  // Selection.near(pos) finds a valid cursor position near pos.
  tr.setSelection(Selection.near(tr.doc.resolve(posAfterHr)));

  if (dispatch) {
    dispatch(tr);
  }
  return true;
};

export const horizontalLinePlugin = createPlugin({
  name: 'horizontalLine',
  nodes: {
    horizontal_rule: {
      group: 'block',
      parseDOM: [{ tag: 'hr' }],
      toDOM() { return ['hr']; },
    },
  },
  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    return [];
  },
  getToolbarItems: (schema: Schema): ToolbarItem[] => {
    return [
      {
        id: 'horizontalLine',
        icon: '—',
        tooltip: 'Horizontal Line',
        command: insertHorizontalLine,
      },
    ];
  },
});
