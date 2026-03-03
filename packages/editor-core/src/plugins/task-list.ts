import { Schema, Node } from 'prosemirror-model';
import {
  EditorState,
  Plugin as ProseMirrorPlugin,
  Transaction,
  TextSelection,
} from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { inputRules, InputRule } from 'prosemirror-inputrules';
import { splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { createPlugin } from './plugin-factory';
import { toggleList } from '../commands/toggleList';

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
// ---------------------------------------------------------------------------
class TaskItemView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private checkbox: HTMLInputElement;
  private currentNode: Node;

  constructor(
    node: Node,
    private readonly view: EditorView,
    private readonly getPos: () => number | undefined,
  ) {
    this.currentNode = node;

    this.dom = document.createElement('li');
    this.dom.className = `inkstream-task-item${node.attrs.checked ? ' checked' : ''}`;
    this.dom.dataset.checked = String(Boolean(node.attrs.checked));

    // Checkbox wrapper (not editable, sits to the left of content)
    const wrapper = document.createElement('span');
    wrapper.className = 'inkstream-task-checkbox-wrapper';
    wrapper.contentEditable = 'false';

    this.checkbox = document.createElement('input');
    this.checkbox.type = 'checkbox';
    this.checkbox.className = 'inkstream-task-checkbox';
    this.checkbox.checked = Boolean(node.attrs.checked);
    this.checkbox.setAttribute('aria-label', 'Toggle task');

    // Prevent mousedown from moving the editor cursor into the checkbox zone
    this.checkbox.addEventListener('mousedown', (e) => e.preventDefault());

    this.checkbox.addEventListener('change', () => {
      const pos = this.getPos();
      if (pos === undefined) return;
      this.view.dispatch(
        this.view.state.tr.setNodeMarkup(pos, undefined, {
          ...this.currentNode.attrs,
          checked: this.checkbox.checked,
        }),
      );
    });

    wrapper.appendChild(this.checkbox);

    // Editable content area
    this.contentDOM = document.createElement('span');
    this.contentDOM.className = 'inkstream-task-content';

    this.dom.appendChild(wrapper);
    this.dom.appendChild(this.contentDOM);
  }

  update(node: Node): boolean {
    if (node.type !== this.currentNode.type) return false;
    this.currentNode = node;
    const checked = Boolean(node.attrs.checked);
    this.checkbox.checked = checked;
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

  getKeymap: (schema: Schema) => {
    const { task_item: taskItemType } = schema.nodes;
    if (!taskItemType) return {};
    return {
      'Mod-Shift-9': toggleTaskList,
      'Tab': (state: EditorState, dispatch?: (tr: Transaction) => void) =>
        sinkListItem(taskItemType)(state, dispatch),
      'Shift-Tab': (state: EditorState, dispatch?: (tr: Transaction) => void) =>
        liftListItem(taskItemType)(state, dispatch),
    };
  },
});
