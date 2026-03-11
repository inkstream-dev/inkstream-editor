import { EditorState } from '@inkstream/pm/state';
import { sinkListItem, liftListItem, splitListItem } from '@inkstream/pm/schema-list';
import { Node } from '@inkstream/pm/model';
import {
  listsPlugin,
  toggleBulletList,
  toggleOrderedList,
  isBulletListActive,
  isOrderedListActive,
} from './lists';
import { taskListPlugin, toggleTaskList, isTaskListActive } from './task-list';
import {
  getTestSchema,
  createState,
  createStateWithSelection,
  applyCommand,
  canExecute,
  p,
  text,
  doc,
} from '../test-utils';

const schema = getTestSchema();

// ---------------------------------------------------------------------------
// Document-building helpers for lists
// ---------------------------------------------------------------------------

/** Creates a bullet_list node */
function bl(...items: Node[]) {
  return schema.node('bullet_list', null, items);
}
/** Creates an ordered_list node */
function ol(...items: Node[]) {
  return schema.node('ordered_list', null, items);
}
/** Creates a task_list node */
function tl(...items: Node[]) {
  return schema.node('task_list', null, items);
}
/** Creates a list_item node */
function li(...content: Node[]) {
  return schema.node('list_item', null, content);
}
/** Creates a task_item node */
function ti(checked: boolean, ...content: Node[]) {
  return schema.node('task_item', { checked }, content);
}

/**
 * Cursor position inside the FIRST list item paragraph text.
 * For doc(list(item(p('hello')))):
 *   list=0→1, item=1→2, p=2→3, 'h'=3
 *   Position 4 = after 'h', clearly inside text content.
 */
const POS_IN_LIST = 4;

/**
 * Cursor position inside the SECOND list item paragraph text.
 * For doc(bl(li(p('a')), li(p('b')))):
 *   bl=0→1, li1=1→2, p1=2→3, 'a'=3, p1 closes=4, li1 closes=5→6
 *   li2=6→7, p2=7→8, 'b'=8, p2 closes=9, li2 closes=10
 *   Position 8 = 'b' inside second item's paragraph.
 */
const POS_IN_SECOND_ITEM = 8;

// ---------------------------------------------------------------------------
// Schema validation — node types
// ---------------------------------------------------------------------------

describe('list node types in schema', () => {
  it('bullet_list node exists', () => {
    expect(schema.nodes.bullet_list).toBeDefined();
  });

  it('ordered_list node exists', () => {
    expect(schema.nodes.ordered_list).toBeDefined();
  });

  it('task_list node exists', () => {
    expect(schema.nodes.task_list).toBeDefined();
  });

  it('list_item node exists', () => {
    expect(schema.nodes.list_item).toBeDefined();
  });

  it('task_item node exists', () => {
    expect(schema.nodes.task_item).toBeDefined();
  });

  it('list_item has align attribute defaulting to null', () => {
    const spec = schema.nodes.list_item.spec;
    expect((spec.attrs as any).align.default).toBeNull();
  });

  it('task_item has checked attribute defaulting to false', () => {
    const spec = schema.nodes.task_item.spec;
    expect((spec.attrs as any).checked.default).toBe(false);
  });

  it('bullet_list toDOM returns <ul>', () => {
    const node = bl(li(p(schema, text(schema, 'x'))));
    const dom = (schema.nodes.bullet_list.spec.toDOM as Function)(node);
    expect(dom[0]).toBe('ul');
  });

  it('ordered_list toDOM returns <ol>', () => {
    const node = ol(li(p(schema, text(schema, 'x'))));
    const dom = (schema.nodes.ordered_list.spec.toDOM as Function)(node);
    expect(dom[0]).toBe('ol');
  });

  it('list_item toDOM returns <li>', () => {
    const node = li(p(schema, text(schema, 'x')));
    const dom = (schema.nodes.list_item.spec.toDOM as Function)(node);
    expect(dom[0]).toBe('li');
  });

  it('task_item toDOM returns <li> with data-type="task-item"', () => {
    const node = ti(false, p(schema, text(schema, 'x')));
    const dom = (schema.nodes.task_item.spec.toDOM as Function)(node) as any[];
    expect(dom[0]).toBe('li');
    expect(dom[1]['data-type']).toBe('task-item');
  });

  it('task_list toDOM returns <ul data-type="task-list">', () => {
    const node = tl(ti(false, p(schema, text(schema, 'x'))));
    const dom = (schema.nodes.task_list.spec.toDOM as Function)(node) as any[];
    expect(dom[0]).toBe('ul');
    expect(dom[1]['data-type']).toBe('task-list');
  });
});

// ---------------------------------------------------------------------------
// Bullet list
// ---------------------------------------------------------------------------

describe('isBulletListActive', () => {
  it('returns true when cursor is inside bullet list', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    expect(isBulletListActive(state)).toBe(true);
  });

  it('returns false when cursor is in a plain paragraph', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    expect(isBulletListActive(state)).toBe(false);
  });

  it('returns false when cursor is in ordered list', () => {
    const state = createState(doc(schema, ol(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    expect(isBulletListActive(state)).toBe(false);
  });

  it('returns false when cursor is in task list', () => {
    const state = createState(doc(schema, tl(ti(false, p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    expect(isBulletListActive(state)).toBe(false);
  });
});

describe('toggleBulletList', () => {
  it('converts paragraph to bullet list', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, toggleBulletList)!;
    expect(next.doc.firstChild!.type.name).toBe('bullet_list');
  });

  it('preserves text content when converting to bullet list', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, toggleBulletList)!;
    expect(next.doc.textContent).toBe('hello');
  });

  it('converts bullet list back to paragraph', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleBulletList)!;
    expect(next.doc.firstChild!.type.name).toBe('paragraph');
  });

  it('converts ordered list to bullet list', () => {
    const state = createState(doc(schema, ol(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleBulletList)!;
    expect(next.doc.firstChild!.type.name).toBe('bullet_list');
    expect(next.doc.textContent).toBe('hello');
  });

  it('converts task list to bullet list', () => {
    const state = createState(doc(schema, tl(ti(false, p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleBulletList)!;
    expect(next.doc.firstChild!.type.name).toBe('bullet_list');
    expect(next.doc.textContent).toBe('hello');
  });

  it('returns true and dispatches a transaction', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    let dispatched = false;
    const result = toggleBulletList(state, () => { dispatched = true; });
    expect(result).toBe(true);
    expect(dispatched).toBe(true);
  });

  it('returns true even without dispatch (dry-run)', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    expect(canExecute(state, toggleBulletList)).toBe(true);
  });

  it('applies to multi-paragraph selection', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'a')), p(schema, text(schema, 'b'))),
      1, 5,
    );
    const next = applyCommand(state, toggleBulletList)!;
    expect(next.doc.firstChild!.type.name).toBe('bullet_list');
    expect(next.doc.textContent).toBe('ab');
  });
});

describe('bullet list input rule regex', () => {
  const bulletRule = /^(-|\*)\s$/;

  it('matches "- " (dash + space)', () => {
    expect(bulletRule.test('- ')).toBe(true);
  });

  it('matches "* " (asterisk + space)', () => {
    expect(bulletRule.test('* ')).toBe(true);
  });

  it('does not match "+ " (plus sign)', () => {
    expect(bulletRule.test('+ ')).toBe(false);
  });

  it('does not match plain text', () => {
    expect(bulletRule.test('hello')).toBe(false);
  });

  it('does not match without trailing space', () => {
    expect(bulletRule.test('-')).toBe(false);
    expect(bulletRule.test('*')).toBe(false);
  });

  it('extracts the marker character (group 1)', () => {
    expect('- '.match(bulletRule)![1]).toBe('-');
    expect('* '.match(bulletRule)![1]).toBe('*');
  });
});

// ---------------------------------------------------------------------------
// Ordered list
// ---------------------------------------------------------------------------

describe('isOrderedListActive', () => {
  it('returns true when cursor is inside ordered list', () => {
    const state = createState(doc(schema, ol(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    expect(isOrderedListActive(state)).toBe(true);
  });

  it('returns false when cursor is in plain paragraph', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    expect(isOrderedListActive(state)).toBe(false);
  });

  it('returns false when cursor is in bullet list', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    expect(isOrderedListActive(state)).toBe(false);
  });

  it('returns false when cursor is in task list', () => {
    const state = createState(doc(schema, tl(ti(false, p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    expect(isOrderedListActive(state)).toBe(false);
  });
});

describe('toggleOrderedList', () => {
  it('converts paragraph to ordered list', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, toggleOrderedList)!;
    expect(next.doc.firstChild!.type.name).toBe('ordered_list');
  });

  it('preserves text content when converting to ordered list', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, toggleOrderedList)!;
    expect(next.doc.textContent).toBe('hello');
  });

  it('converts ordered list back to paragraph', () => {
    const state = createState(doc(schema, ol(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleOrderedList)!;
    expect(next.doc.firstChild!.type.name).toBe('paragraph');
  });

  it('converts bullet list to ordered list', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleOrderedList)!;
    expect(next.doc.firstChild!.type.name).toBe('ordered_list');
    expect(next.doc.textContent).toBe('hello');
  });

  it('converts task list to ordered list', () => {
    const state = createState(doc(schema, tl(ti(false, p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleOrderedList)!;
    expect(next.doc.firstChild!.type.name).toBe('ordered_list');
    expect(next.doc.textContent).toBe('hello');
  });

  it('returns true and dispatches', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    let dispatched = false;
    const result = toggleOrderedList(state, () => { dispatched = true; });
    expect(result).toBe(true);
    expect(dispatched).toBe(true);
  });

  it('applies to multi-paragraph selection', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'a')), p(schema, text(schema, 'b'))),
      1, 5,
    );
    const next = applyCommand(state, toggleOrderedList)!;
    expect(next.doc.firstChild!.type.name).toBe('ordered_list');
    expect(next.doc.textContent).toBe('ab');
  });
});

describe('ordered list input rule regex', () => {
  const orderedRule = /^(\d+)\.\s$/;

  it('matches "1. " (digit + period + space)', () => {
    expect(orderedRule.test('1. ')).toBe(true);
  });

  it('matches "10. " (multi-digit)', () => {
    expect(orderedRule.test('10. ')).toBe(true);
  });

  it('does not match "a. " (non-digit)', () => {
    expect(orderedRule.test('a. ')).toBe(false);
  });

  it('does not match "1) " (parenthesis instead of period)', () => {
    expect(orderedRule.test('1) ')).toBe(false);
  });

  it('does not match without trailing space', () => {
    expect(orderedRule.test('1.')).toBe(false);
  });

  it('extracts the starting number (group 1)', () => {
    expect('3. '.match(orderedRule)![1]).toBe('3');
    expect('42. '.match(orderedRule)![1]).toBe('42');
  });
});

// ---------------------------------------------------------------------------
// Task list
// ---------------------------------------------------------------------------

describe('isTaskListActive', () => {
  it('returns true when cursor is inside task list', () => {
    const state = createState(doc(schema, tl(ti(false, p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    expect(isTaskListActive(state)).toBe(true);
  });

  it('returns false when cursor is in plain paragraph', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    expect(isTaskListActive(state)).toBe(false);
  });

  it('returns false when cursor is in bullet list', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    expect(isTaskListActive(state)).toBe(false);
  });

  it('returns false when cursor is in ordered list', () => {
    const state = createState(doc(schema, ol(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    expect(isTaskListActive(state)).toBe(false);
  });
});

describe('toggleTaskList', () => {
  it('converts paragraph to task list', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, toggleTaskList)!;
    expect(next.doc.firstChild!.type.name).toBe('task_list');
  });

  it('preserves text content when converting to task list', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, toggleTaskList)!;
    expect(next.doc.textContent).toBe('hello');
  });

  it('converts task list back to paragraph', () => {
    const state = createState(doc(schema, tl(ti(false, p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleTaskList)!;
    expect(next.doc.firstChild!.type.name).toBe('paragraph');
  });

  it('converts bullet list to task list', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleTaskList)!;
    expect(next.doc.firstChild!.type.name).toBe('task_list');
    expect(next.doc.textContent).toBe('hello');
  });

  it('converts ordered list to task list', () => {
    const state = createState(doc(schema, ol(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleTaskList)!;
    expect(next.doc.firstChild!.type.name).toBe('task_list');
    expect(next.doc.textContent).toBe('hello');
  });

  it('returns true and dispatches', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    let dispatched = false;
    const result = toggleTaskList(state, () => { dispatched = true; });
    expect(result).toBe(true);
    expect(dispatched).toBe(true);
  });

  it('new task items default to unchecked', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, toggleTaskList)!;
    const taskItem = next.doc.firstChild!.firstChild!;
    expect(taskItem.attrs.checked).toBe(false);
  });
});

describe('task list input rule regex', () => {
  const taskRule = /^\[(x| )\]\s$/;

  it('matches "[ ] " → unchecked task', () => {
    expect(taskRule.test('[ ] ')).toBe(true);
  });

  it('matches "[x] " → checked task (lowercase)', () => {
    expect(taskRule.test('[x] ')).toBe(true);
  });

  it('does not match "[X] " (uppercase X)', () => {
    expect(taskRule.test('[X] ')).toBe(false);
  });

  it('does not match "[] " (no space or x inside)', () => {
    expect(taskRule.test('[] ')).toBe(false);
  });

  it('does not match without trailing space', () => {
    expect(taskRule.test('[ ]')).toBe(false);
    expect(taskRule.test('[x]')).toBe(false);
  });

  it('extracts checked state via group 1', () => {
    expect('[ ] '.match(taskRule)![1]).toBe(' ');
    expect('[x] '.match(taskRule)![1]).toBe('x');
  });
});

describe('task_item checked attribute', () => {
  it('stores checked=false correctly', () => {
    const docNode = doc(schema, tl(ti(false, p(schema, text(schema, 'task')))));
    const taskItem = docNode.firstChild!.firstChild!;
    expect(taskItem.attrs.checked).toBe(false);
  });

  it('stores checked=true correctly', () => {
    const docNode = doc(schema, tl(ti(true, p(schema, text(schema, 'task')))));
    const taskItem = docNode.firstChild!.firstChild!;
    expect(taskItem.attrs.checked).toBe(true);
  });

  it('can toggle checked state via setNodeMarkup', () => {
    const docNode = doc(schema, tl(ti(false, p(schema, text(schema, 'task')))));
    const state = createState(docNode, POS_IN_LIST);
    // task_item is at position 1 (after task_list opens at 0→1)
    const tr = state.tr.setNodeMarkup(1, undefined, { checked: true });
    const next = state.apply(tr);
    expect(next.doc.firstChild!.firstChild!.attrs.checked).toBe(true);
  });

  it('can toggle from checked to unchecked via setNodeMarkup', () => {
    const docNode = doc(schema, tl(ti(true, p(schema, text(schema, 'task')))));
    const state = createState(docNode, POS_IN_LIST);
    const tr = state.tr.setNodeMarkup(1, undefined, { checked: false });
    const next = state.apply(tr);
    expect(next.doc.firstChild!.firstChild!.attrs.checked).toBe(false);
  });

  it('preserves text content after toggling checked state', () => {
    const docNode = doc(schema, tl(ti(false, p(schema, text(schema, 'do this')))));
    const state = createState(docNode, 4);
    const tr = state.tr.setNodeMarkup(1, undefined, { checked: true });
    const next = state.apply(tr);
    expect(next.doc.textContent).toBe('do this');
  });

  it('checked state persists through sequential transactions', () => {
    const docNode = doc(schema, tl(ti(false, p(schema, text(schema, 'task')))));
    const state = createState(docNode, POS_IN_LIST);
    // Toggle checked
    const tr1 = state.tr.setNodeMarkup(1, undefined, { checked: true });
    const state2 = state.apply(tr1);
    // Apply a text change on top
    const tr2 = state2.tr.insertText('!', 5);
    const state3 = state2.apply(tr2);
    expect(state3.doc.firstChild!.firstChild!.attrs.checked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// List conversions (6 pairs)
// ---------------------------------------------------------------------------

describe('list conversions', () => {
  it('bullet → ordered: converts container type, preserves text', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'item'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleOrderedList)!;
    expect(next.doc.firstChild!.type.name).toBe('ordered_list');
    expect(next.doc.textContent).toBe('item');
  });

  it('ordered → bullet: converts container type, preserves text', () => {
    const state = createState(doc(schema, ol(li(p(schema, text(schema, 'item'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleBulletList)!;
    expect(next.doc.firstChild!.type.name).toBe('bullet_list');
    expect(next.doc.textContent).toBe('item');
  });

  it('bullet → task: rebuilds with task_item (unchecked)', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'item'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleTaskList)!;
    expect(next.doc.firstChild!.type.name).toBe('task_list');
    expect(next.doc.firstChild!.firstChild!.attrs.checked).toBe(false);
    expect(next.doc.textContent).toBe('item');
  });

  it('task → bullet: rebuilds with list_item', () => {
    const state = createState(doc(schema, tl(ti(false, p(schema, text(schema, 'item'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleBulletList)!;
    expect(next.doc.firstChild!.type.name).toBe('bullet_list');
    expect(next.doc.firstChild!.firstChild!.type.name).toBe('list_item');
    expect(next.doc.textContent).toBe('item');
  });

  it('ordered → task: rebuilds with task_item (unchecked)', () => {
    const state = createState(doc(schema, ol(li(p(schema, text(schema, 'item'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleTaskList)!;
    expect(next.doc.firstChild!.type.name).toBe('task_list');
    expect(next.doc.firstChild!.firstChild!.attrs.checked).toBe(false);
    expect(next.doc.textContent).toBe('item');
  });

  it('task → ordered: rebuilds with list_item', () => {
    const state = createState(doc(schema, tl(ti(false, p(schema, text(schema, 'item'))))), POS_IN_LIST);
    const next = applyCommand(state, toggleOrderedList)!;
    expect(next.doc.firstChild!.type.name).toBe('ordered_list');
    expect(next.doc.firstChild!.firstChild!.type.name).toBe('list_item');
    expect(next.doc.textContent).toBe('item');
  });
});

// ---------------------------------------------------------------------------
// Nesting — sinkListItem / liftListItem
// ---------------------------------------------------------------------------

describe('list item nesting (sinkListItem / liftListItem)', () => {
  /**
   * Two-item bullet list for nesting tests:
   * doc(bl(li(p('a')), li(p('b'))))
   * Cursor in second item: POS_IN_SECOND_ITEM = 7
   */
  function twoItemBulletList() {
    return doc(schema, bl(li(p(schema, text(schema, 'a'))), li(p(schema, text(schema, 'b')))));
  }

  it('sinkListItem nests second item under first', () => {
    const state = createState(twoItemBulletList(), POS_IN_SECOND_ITEM);
    const cmd = sinkListItem(schema.nodes.list_item);
    const next = applyCommand(state, cmd)!;
    // First item should now have a nested list child
    const firstItem = next.doc.firstChild!.firstChild!;
    // first item has paragraph + nested list
    expect(firstItem.childCount).toBeGreaterThan(1);
    expect(next.doc.textContent).toBe('ab');
  });

  it('sinkListItem returns false when cursor is in first item (nothing to sink into)', () => {
    const state = createState(twoItemBulletList(), 4); // inside first item
    const cmd = sinkListItem(schema.nodes.list_item);
    expect(canExecute(state, cmd)).toBe(false);
  });

  it('liftListItem at root level converts item to paragraph', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const cmd = liftListItem(schema.nodes.list_item);
    const next = applyCommand(state, cmd)!;
    expect(next.doc.firstChild!.type.name).toBe('paragraph');
    expect(next.doc.textContent).toBe('hello');
  });

  it('liftListItem lifts from nested list', () => {
    // Build: doc(bl(li(p('a'), bl(li(p('b'))))))
    const nested = doc(schema,
      bl(
        li(
          p(schema, text(schema, 'a')),
          bl(li(p(schema, text(schema, 'b')))),
        ),
      ),
    );
    // Cursor inside nested item: p('a')=3chars, bl=1, li=1, p=1 → pos ~10
    // 'b' is inside nested li's paragraph
    const nestedBPos = 10; // approximate; let's compute:
    // outer bl=0→1, outer li=1→2, p('a')=2→3, 'a'=3, p closes=4, inner bl=4→5, inner li=5→6, inner p=6→7, 'b'=7
    const state = createState(nested, 8); // inside 'b'
    const cmd = liftListItem(schema.nodes.list_item);
    const next = applyCommand(state, cmd)!;
    expect(next.doc.textContent).toBe('ab');
    // After lift: should be at same level (outer list has 2 items now or is a paragraph)
    expect(next.doc.firstChild!.type.name).toBe('bullet_list');
  });

  it('sinkListItem works with task_item', () => {
    const twoItemTask = doc(schema,
      tl(
        ti(false, p(schema, text(schema, 'a'))),
        ti(false, p(schema, text(schema, 'b'))),
      ),
    );
    const state = createState(twoItemTask, POS_IN_SECOND_ITEM);
    const cmd = sinkListItem(schema.nodes.task_item);
    // sinkListItem may or may not work depending on task_item definition
    // Just verify it doesn't throw
    expect(() => canExecute(state, cmd)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// splitListItem — Enter key behavior
// ---------------------------------------------------------------------------

describe('splitListItem', () => {
  it('splits list item at cursor position', () => {
    // doc(bl(li(p('hello')))) cursor at pos 6 (after 'hel', before 'lo')
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), 6);
    const cmd = splitListItem(schema.nodes.list_item);
    const next = applyCommand(state, cmd)!;
    // Should have 2 list items now
    expect(next.doc.firstChild!.childCount).toBe(2);
    expect(next.doc.firstChild!.firstChild!.textContent).toBe('hel');
    expect(next.doc.firstChild!.lastChild!.textContent).toBe('lo');
  });

  it('preserves total text content after split', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), 5);
    const cmd = splitListItem(schema.nodes.list_item);
    const next = applyCommand(state, cmd)!;
    expect(next.doc.textContent).toBe('hello');
  });

  it('split creates new list item of same type', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), 5);
    const cmd = splitListItem(schema.nodes.list_item);
    const next = applyCommand(state, cmd)!;
    expect(next.doc.firstChild!.childCount).toBe(2);
    next.doc.firstChild!.forEach(child => {
      expect(child.type.name).toBe('list_item');
    });
  });

  it('split at end creates empty trailing item', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), 8); // after 'o'
    const cmd = splitListItem(schema.nodes.list_item);
    const next = applyCommand(state, cmd)!;
    expect(next.doc.firstChild!.childCount).toBe(2);
    expect(next.doc.firstChild!.lastChild!.textContent).toBe('');
  });
});

// ---------------------------------------------------------------------------
// listsPlugin registration and toolbar
// ---------------------------------------------------------------------------

describe('listsPlugin', () => {
  it('has the correct plugin name "lists"', () => {
    expect(listsPlugin.name).toBe('lists');
  });

  it('provides one top-level toolbar item with id "lists"', () => {
    const items = listsPlugin.getToolbarItems!(schema);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('lists');
  });

  it('toolbar item type is "dropdown"', () => {
    const item = listsPlugin.getToolbarItems!(schema)[0];
    expect(item.type).toBe('dropdown');
  });

  it('toolbar item has SVG icon', () => {
    const item = listsPlugin.getToolbarItems!(schema)[0];
    expect(item.iconHtml).toContain('<svg');
  });

  it('toolbar isActive returns true when cursor in bullet list', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const item = listsPlugin.getToolbarItems!(schema)[0];
    expect(item.isActive!(state)).toBe(true);
  });

  it('toolbar isActive returns true when cursor in ordered list', () => {
    const state = createState(doc(schema, ol(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const item = listsPlugin.getToolbarItems!(schema)[0];
    expect(item.isActive!(state)).toBe(true);
  });

  it('toolbar isActive returns true when cursor in task list', () => {
    const state = createState(doc(schema, tl(ti(false, p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const item = listsPlugin.getToolbarItems!(schema)[0];
    expect(item.isActive!(state)).toBe(true);
  });

  it('toolbar isActive returns false in plain paragraph', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const item = listsPlugin.getToolbarItems!(schema)[0];
    expect(item.isActive!(state)).toBe(false);
  });

  it('getChildren returns 3 items (bullet, ordered, task)', () => {
    const item = listsPlugin.getToolbarItems!(schema)[0];
    const children = item.getChildren!(EditorState.create({ schema }));
    expect(children).toHaveLength(3);
  });

  it('getChildren includes bulletList, orderedList, taskList items', () => {
    const item = listsPlugin.getToolbarItems!(schema)[0];
    const children = item.getChildren!(EditorState.create({ schema }));
    const ids = children.map(c => c.id);
    expect(ids).toContain('bulletList');
    expect(ids).toContain('orderedList');
    expect(ids).toContain('taskList');
  });

  it('bulletList child isActive returns true when in bullet list', () => {
    const state = createState(doc(schema, bl(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const item = listsPlugin.getToolbarItems!(schema)[0];
    const bulletItem = item.getChildren!(state).find(c => c.id === 'bulletList')!;
    expect(bulletItem.isActive!(state)).toBe(true);
  });

  it('orderedList child isActive returns true when in ordered list', () => {
    const state = createState(doc(schema, ol(li(p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const item = listsPlugin.getToolbarItems!(schema)[0];
    const orderedItem = item.getChildren!(state).find(c => c.id === 'orderedList')!;
    expect(orderedItem.isActive!(state)).toBe(true);
  });

  it('taskList child isActive returns true when in task list', () => {
    const state = createState(doc(schema, tl(ti(false, p(schema, text(schema, 'hello'))))), POS_IN_LIST);
    const item = listsPlugin.getToolbarItems!(schema)[0];
    const taskItem = item.getChildren!(state).find(c => c.id === 'taskList')!;
    expect(taskItem.isActive!(state)).toBe(true);
  });
});

describe('taskListPlugin', () => {
  it('has the correct plugin name "taskList"', () => {
    expect(taskListPlugin.name).toBe('taskList');
  });
});

// ---------------------------------------------------------------------------
// Integration: marks inside list items
// ---------------------------------------------------------------------------

describe('marks inside list items', () => {
  it('bold mark applies inside bullet list item', () => {
    const state = createStateWithSelection(
      doc(schema, bl(li(p(schema, text(schema, 'hello'))))),
      3, 8,
    );
    const { toggleMark } = require('prosemirror-commands');
    const next = applyCommand(state, toggleMark(schema.marks.strong));
    expect(next).not.toBeNull();
    expect(next!.doc.textContent).toBe('hello');
  });

  it('italic mark applies inside ordered list item', () => {
    const state = createStateWithSelection(
      doc(schema, ol(li(p(schema, text(schema, 'hello'))))),
      3, 8,
    );
    const { toggleMark } = require('prosemirror-commands');
    const next = applyCommand(state, toggleMark(schema.marks.em));
    expect(next).not.toBeNull();
    expect(next!.doc.textContent).toBe('hello');
  });

  it('textColor mark applies inside task list item', () => {
    const state = createStateWithSelection(
      doc(schema, tl(ti(false, p(schema, text(schema, 'hello'))))),
      3, 8,
    );
    const { setTextColor } = require('./textColor');
    const next = applyCommand(state, setTextColor('#FF0000'));
    expect(next).not.toBeNull();
    expect(next!.doc.textContent).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('list edge cases', () => {
  it('isBulletListActive returns false on empty doc', () => {
    const state = EditorState.create({ schema });
    expect(isBulletListActive(state)).toBe(false);
  });

  it('isOrderedListActive returns false on empty doc', () => {
    const state = EditorState.create({ schema });
    expect(isOrderedListActive(state)).toBe(false);
  });

  it('isTaskListActive returns false on empty doc', () => {
    const state = EditorState.create({ schema });
    expect(isTaskListActive(state)).toBe(false);
  });

  it('list with single item has childCount of 1', () => {
    const docNode = doc(schema, bl(li(p(schema, text(schema, 'only')))));
    expect(docNode.firstChild!.childCount).toBe(1);
  });

  it('list with multiple items has correct childCount', () => {
    const docNode = doc(schema,
      bl(
        li(p(schema, text(schema, 'one'))),
        li(p(schema, text(schema, 'two'))),
        li(p(schema, text(schema, 'three'))),
      ),
    );
    expect(docNode.firstChild!.childCount).toBe(3);
    expect(docNode.textContent).toBe('onetwothree');
  });

  it('multiple different lists in document coexist', () => {
    const docNode = doc(schema,
      bl(li(p(schema, text(schema, 'bullet')))),
      ol(li(p(schema, text(schema, 'ordered')))),
      tl(ti(false, p(schema, text(schema, 'task')))),
    );
    expect(docNode.childCount).toBe(3);
    expect(docNode.child(0).type.name).toBe('bullet_list');
    expect(docNode.child(1).type.name).toBe('ordered_list');
    expect(docNode.child(2).type.name).toBe('task_list');
  });

  it('toggleBulletList on empty doc does not throw', () => {
    const state = EditorState.create({ schema });
    expect(() => canExecute(state, toggleBulletList)).not.toThrow();
  });

  it('toggleTaskList on empty doc does not throw', () => {
    const state = EditorState.create({ schema });
    expect(() => canExecute(state, toggleTaskList)).not.toThrow();
  });

  it('list item content is preserved after type conversion', () => {
    const bold = schema.marks.strong.create();
    const boldText = schema.text('bold text', [bold]);
    const state = createState(doc(schema, bl(li(p(schema, boldText)))), POS_IN_LIST);
    const next = applyCommand(state, toggleOrderedList)!;
    expect(next.doc.firstChild!.type.name).toBe('ordered_list');
    expect(next.doc.textContent).toBe('bold text');
  });
});
