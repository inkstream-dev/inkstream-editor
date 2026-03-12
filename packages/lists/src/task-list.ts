import { Schema, Node } from '@inkstream/pm/model';
import {
  EditorState,
  Plugin as ProseMirrorPlugin,
  Transaction,
  TextSelection,
} from '@inkstream/pm/state';
import { EditorView } from '@inkstream/pm/view';
import { inputRules, InputRule } from '@inkstream/pm/inputrules';
import { splitListItem } from '@inkstream/pm/schema-list';
import { createPlugin } from '@inkstream/editor-core';
import { toggleList } from './toggleList';

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
export const toggleTaskList = (
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
): boolean => {
  const { task_list: taskListType, task_item: taskItemType } = state.schema.nodes;
  if (!taskListType || !taskItemType) return false;
  return toggleList(taskListType, taskItemType)(state, dispatch);
};

export const isTaskListActive = (state: EditorState): boolean => {
  const taskListType = state.schema.nodes.task_list;
  if (!taskListType) return false;
  let active = false;
  state.doc.nodesBetween(state.selection.$from.pos, state.selection.to, (node) => {
    if (node.type === taskListType) { active = true; return false; }
  });
  return active;
};

// ---------------------------------------------------------------------------
// TaskItemView — interactive checkbox NodeView
// Structure mirrors professional editors (Tiptap pattern):
//   li[data-checked]
//     label[contenteditable=false]   ← cursor guard, non-editable
//       input[type=checkbox]         ← hidden real checkbox (a11y / label association)
//       span.indicator               ← custom visual checkbox
//     div.content                    ← contentDOM (editable text)
// ---------------------------------------------------------------------------
class TaskItemView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private input: HTMLInputElement;
  private currentNode: Node;

  constructor(
    node: Node,
    private readonly view: EditorView,
    private readonly getPos: () => number | undefined,
  ) {
    this.currentNode = node;

    // ── Root <li> ─────────────────────────────────────────────────────────
    this.dom = document.createElement('li');
    this.dom.className = `inkstream-task-item${node.attrs.checked ? ' checked' : ''}`;
    this.dom.dataset.checked = String(Boolean(node.attrs.checked));

    // ── Label (cursor guard + click target) ───────────────────────────────
    const label = document.createElement('label');
    label.contentEditable = 'false';
    label.className = 'inkstream-task-label';
    // Prevent ProseMirror from repositioning cursor when clicking the checkbox.
    // Placed on the label (not the input) so it intercepts all pointer events
    // in the checkbox column while still allowing the label→input click chain.
    label.addEventListener('mousedown', (e) => e.preventDefault());

    // ── Hidden real input (semantics + keyboard a11y) ─────────────────────
    this.input = document.createElement('input');
    this.input.type = 'checkbox';
    this.input.className = 'inkstream-task-input';
    this.input.checked = Boolean(node.attrs.checked);
    this.input.setAttribute('aria-label', 'Toggle task');

    // ── Visual indicator (custom styled checkbox) ─────────────────────────
    const indicator = document.createElement('span');
    indicator.className = 'inkstream-task-indicator';
    indicator.setAttribute('aria-hidden', 'true');

    // When the input toggles:
    // 1. Immediately reflect in data-checked (CSS is driven by this attr, not :checked,
    //    so there are no specificity fights with :hover).
    // 2. Dispatch the ProseMirror transaction.
    // update() will be called synchronously and keeps input.checked in sync.
    this.input.addEventListener('change', () => {
      const checked = this.input.checked;
      // Optimistic DOM update for zero-latency visual feedback
      this.dom.dataset.checked = String(checked);
      if (checked) this.dom.classList.add('checked');
      else this.dom.classList.remove('checked');

      const pos = this.getPos();
      if (pos === undefined) return;
      this.view.dispatch(
        this.view.state.tr.setNodeMarkup(pos, undefined, {
          ...this.currentNode.attrs,
          checked,
        }),
      );
    });

    label.appendChild(this.input);
    label.appendChild(indicator);

    // ── Editable content area (block container) ───────────────────────────
    this.contentDOM = document.createElement('div');
    this.contentDOM.className = 'inkstream-task-content';

    this.dom.appendChild(label);
    this.dom.appendChild(this.contentDOM);
  }

  update(node: Node): boolean {
    if (node.type !== this.currentNode.type) return false;
    this.currentNode = node;
    const checked = Boolean(node.attrs.checked);
    // Sync native input state (enables keyboard toggle via Space)
    this.input.checked = checked;
    this.dom.dataset.checked = String(checked);
    if (checked) this.dom.classList.add('checked');
    else this.dom.classList.remove('checked');
    return true;
  }
}

// ---------------------------------------------------------------------------
// Input rules: `[ ] ` → unchecked task item, `[x] ` → checked task item
// ---------------------------------------------------------------------------
function buildTaskInputRules(schema: Schema): InputRule[] {
  const { task_list: taskListType, task_item: taskItemType, paragraph: paraType } = schema.nodes;
  if (!taskListType || !taskItemType || !paraType) return [];

  return [
    new InputRule(/^\[(x| )\]\s$/, (state, match, start, end) => {
      const $start = state.doc.resolve(start);
      // Only fire inside a plain paragraph
      if ($start.parent.type.name !== 'paragraph') return null;

      const checked = match[1] === 'x';
      const replaceFrom = $start.before($start.depth);
      const replaceTo   = $start.after($start.depth);

      const taskItem = taskItemType.create({ checked }, paraType.create());
      const taskList = taskListType.create({}, taskItem);
      let tr = state.tr.replaceWith(replaceFrom, replaceTo, taskList);
      // Position cursor inside the empty paragraph of the new task item
      tr = tr.setSelection(TextSelection.create(tr.doc, replaceFrom + 3));
      return tr;
    }),
  ];
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------
export const taskListPlugin = createPlugin({
  name: 'taskList',

  nodes: {
    task_list: {
      content: 'task_item+',
      group: 'block',
      parseDOM: [{ tag: 'ul[data-type="task-list"]' }],
      toDOM() {
        return ['ul', { class: 'inkstream-task-list', 'data-type': 'task-list' }, 0];
      },
    },

    task_item: {
      content: 'paragraph block*',
      defining: true,
      attrs: {
        checked: { default: false },
      },
      parseDOM: [{
        tag: 'li[data-type="task-item"]',
        getAttrs(dom: HTMLElement | string) {
          return { checked: (dom as HTMLElement).getAttribute('data-checked') === 'true' };
        },
      }],
      toDOM(node: Node) {
        return ['li', {
          'data-type': 'task-item',
          'data-checked': node.attrs.checked ? 'true' : 'false',
          class: `inkstream-task-item${node.attrs.checked ? ' checked' : ''}`,
        }, 0];
      },
    },
  },

  getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
    const { task_item: taskItemType } = schema.nodes;
    if (!taskItemType) return [];

    return [
      // NodeView registration for interactive checkboxes
      new ProseMirrorPlugin({
        props: {
          nodeViews: {
            task_item: (node, view, getPos) =>
              new TaskItemView(node, view, getPos as () => number | undefined),
          },
        },
      }),
      // Markdown input rules
      inputRules({ rules: buildTaskInputRules(schema) }),
    ];
  },

  getKeymap: (_schema: Schema) => {
    // Shortcuts consolidated in listsPlugin to avoid keymap override conflicts.
    return {};
  },
});
