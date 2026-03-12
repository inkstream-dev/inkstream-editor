import { EditorState } from '@inkstream/pm/state';
import { setBlockType } from '@inkstream/pm/commands';
import { headingPlugin } from '@inkstream/heading';
import { setTextColor } from '@inkstream/text-color';
import type { ToolbarItem } from '../index';
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
// Document-building helpers
// ---------------------------------------------------------------------------

function h(level: number, ...content: any[]) {
  return schema.node('heading', { level }, content.map(c =>
    typeof c === 'string' ? schema.text(c) : c,
  ));
}

// Cursor position inside heading text:
// doc(h(level, 'text')): heading=0→1, p_content=1→2, 'h'=2 … pos 2 is first char
const POS_IN_HEADING = 3;

// ---------------------------------------------------------------------------
// Schema — heading node definition
// ---------------------------------------------------------------------------

describe('heading node schema', () => {
  it('heading node exists in schema', () => {
    expect(schema.nodes.heading).toBeDefined();
  });

  it('heading has level attribute with default 1', () => {
    expect((schema.nodes.heading.spec.attrs as any).level.default).toBe(1);
  });

  it('heading has align attribute with default null', () => {
    expect((schema.nodes.heading.spec.attrs as any).align.default).toBeNull();
  });

  it('heading content model is "inline*"', () => {
    expect(schema.nodes.heading.spec.content).toBe('inline*');
  });

  it('heading is in block group', () => {
    expect(schema.nodes.heading.spec.group).toBe('block');
  });

  it('heading has defining: true', () => {
    expect((schema.nodes.heading.spec as any).defining).toBe(true);
  });

  it('heading supports all marks (_)', () => {
    expect(schema.nodes.heading.spec.marks).toBe('_');
  });

  it.each([1, 2, 3, 4, 5, 6])('toDOM renders correct tag for H%i', (level) => {
    const node = h(level, schema.text('test'));
    const dom = (schema.nodes.heading.spec.toDOM as Function)(node) as any[];
    expect(dom[0]).toBe(`h${level}`);
  });

  it('toDOM includes style attribute when align is set', () => {
    const node = schema.node('heading', { level: 1, align: 'center' }, schema.text('test'));
    const dom = (schema.nodes.heading.spec.toDOM as Function)(node) as any[];
    expect(dom[1].style).toBe('text-align: center');
  });

  it('toDOM omits style attribute when align is null', () => {
    const node = h(1, schema.text('test'));
    const dom = (schema.nodes.heading.spec.toDOM as Function)(node) as any[];
    expect(dom[1].style).toBeUndefined();
  });

  it('parseDOM has rules for h1 through h6', () => {
    const parseRules = schema.nodes.heading.spec.parseDOM as any[];
    const tags = parseRules.map(r => r.tag);
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
      expect(tags).toContain(tag);
    });
  });
});

// ---------------------------------------------------------------------------
// setBlockType(heading, { level }) — the primary command
// ---------------------------------------------------------------------------

describe('setHeading (setBlockType)', () => {
  it.each([1, 2, 3, 4, 5, 6])('converts paragraph to H%i', (level) => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const cmd = setBlockType(schema.nodes.heading, { level });
    const next = applyCommand(state, cmd)!;
    expect(next.doc.firstChild!.type.name).toBe('heading');
    expect(next.doc.firstChild!.attrs.level).toBe(level);
  });

  it.each([1, 2, 3, 4, 5, 6])('preserves text content when converting to H%i', (level) => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const cmd = setBlockType(schema.nodes.heading, { level });
    const next = applyCommand(state, cmd)!;
    expect(next.doc.textContent).toBe('hello');
  });

  it('converts heading level 1 to level 2', () => {
    const state = createState(doc(schema, h(1, 'hello')), POS_IN_HEADING);
    const cmd = setBlockType(schema.nodes.heading, { level: 2 });
    const next = applyCommand(state, cmd)!;
    expect(next.doc.firstChild!.attrs.level).toBe(2);
    expect(next.doc.textContent).toBe('hello');
  });

  it('converts H3 to H5', () => {
    const state = createState(doc(schema, h(3, 'test')), POS_IN_HEADING);
    const cmd = setBlockType(schema.nodes.heading, { level: 5 });
    const next = applyCommand(state, cmd)!;
    expect(next.doc.firstChild!.attrs.level).toBe(5);
  });

  it('converts heading back to paragraph via setBlockType(paragraph)', () => {
    const state = createState(doc(schema, h(2, 'hello')), POS_IN_HEADING);
    const cmd = setBlockType(schema.nodes.paragraph);
    const next = applyCommand(state, cmd)!;
    expect(next.doc.firstChild!.type.name).toBe('paragraph');
    expect(next.doc.textContent).toBe('hello');
  });

  it('returns true and dispatches a transaction', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    let dispatched = false;
    const result = setBlockType(schema.nodes.heading, { level: 1 })(state, () => { dispatched = true; });
    expect(result).toBe(true);
    expect(dispatched).toBe(true);
  });

  it('returns true without dispatch (dry-run)', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    expect(canExecute(state, setBlockType(schema.nodes.heading, { level: 1 }))).toBe(true);
  });

  it('applies to empty paragraph', () => {
    const state = createState(doc(schema, p(schema)), 1);
    const cmd = setBlockType(schema.nodes.heading, { level: 1 });
    const next = applyCommand(state, cmd)!;
    expect(next.doc.firstChild!.type.name).toBe('heading');
    expect(next.doc.firstChild!.attrs.level).toBe(1);
  });

  it('preserves inline marks (bold) during conversion', () => {
    const boldText = schema.text('hello', [schema.marks.strong.create()]);
    const state = createState(doc(schema, p(schema, boldText)), 2);
    const cmd = setBlockType(schema.nodes.heading, { level: 1 });
    const next = applyCommand(state, cmd)!;
    const headingNode = next.doc.firstChild!;
    expect(headingNode.type.name).toBe('heading');
    const textNode = headingNode.firstChild!;
    expect(schema.marks.strong.isInSet(textNode.marks)).not.toBeUndefined();
  });

  it('preserves italic marks during conversion', () => {
    const italicText = schema.text('hello', [schema.marks.em.create()]);
    const state = createState(doc(schema, p(schema, italicText)), 2);
    const next = applyCommand(state, setBlockType(schema.nodes.heading, { level: 2 }))!;
    const textNode = next.doc.firstChild!.firstChild!;
    expect(schema.marks.em.isInSet(textNode.marks)).not.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Active state detection
// ---------------------------------------------------------------------------

describe('isHeadingActive (toolbar isActive)', () => {
  const toolbarItem = headingPlugin.getToolbarItems!(schema)[0];

  it('toolbar isActive returns true when cursor is in heading', () => {
    const state = createState(doc(schema, h(1, 'hello')), POS_IN_HEADING);
    expect(toolbarItem.isActive!(state)).toBe(true);
  });

  it('toolbar isActive returns false when cursor is in paragraph', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    expect(toolbarItem.isActive!(state)).toBe(false);
  });

  it.each([1, 2, 3, 4, 5, 6])('isActive returns true for H%i', (level) => {
    const state = createState(doc(schema, h(level, 'hello')), POS_IN_HEADING);
    expect(toolbarItem.isActive!(state)).toBe(true);
  });

  it('isActive returns false in empty doc', () => {
    const state = EditorState.create({ schema });
    expect(toolbarItem.isActive!(state)).toBe(false);
  });

  // Per-level isActive via children items
  it.each([1, 2, 3, 4, 5, 6])('heading%i child isActive returns true when in H%i', (level) => {
    const state = createState(doc(schema, h(level, 'hello')), POS_IN_HEADING);
    const child = toolbarItem.children!.find((c: ToolbarItem) => c.id === `heading${level}`)!;
    expect(child.isActive!(state)).toBe(true);
  });

  it.each([1, 2, 3, 4, 5, 6])('heading%i child isActive returns false for wrong level', (level) => {
    const otherLevel = level === 1 ? 2 : 1;
    const state = createState(doc(schema, h(otherLevel, 'hello')), POS_IN_HEADING);
    const child = toolbarItem.children!.find((c: ToolbarItem) => c.id === `heading${level}`)!;
    expect(child.isActive!(state)).toBe(false);
  });

  it('paragraph child isActive returns true when cursor is in paragraph', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const paraChild = toolbarItem.children!.find((c: ToolbarItem) => c.id === 'paragraph')!;
    expect(paraChild.isActive!(state)).toBe(true);
  });

  it('paragraph child isActive returns false when cursor is in heading', () => {
    const state = createState(doc(schema, h(1, 'hello')), POS_IN_HEADING);
    const paraChild = toolbarItem.children!.find((c: ToolbarItem) => c.id === 'paragraph')!;
    expect(paraChild.isActive!(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// headingPlugin toolbar structure
// ---------------------------------------------------------------------------

describe('headingPlugin toolbar', () => {
  it('has the correct plugin name "heading"', () => {
    expect(headingPlugin.name).toBe('heading');
  });

  it('provides one toolbar item with id "heading"', () => {
    const items = headingPlugin.getToolbarItems!(schema);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('heading');
  });

  it('toolbar item type is "dropdown"', () => {
    const item = headingPlugin.getToolbarItems!(schema)[0];
    expect(item.type).toBe('dropdown');
  });

  it('toolbar item has SVG icon', () => {
    const item = headingPlugin.getToolbarItems!(schema)[0];
    expect(item.iconHtml).toContain('<svg');
  });

  it('toolbar item has tooltip "Text style"', () => {
    const item = headingPlugin.getToolbarItems!(schema)[0];
    expect(item.tooltip).toBe('Text style');
  });

  it('children includes paragraph + 6 heading levels = 7 items', () => {
    const item = headingPlugin.getToolbarItems!(schema)[0];
    expect(item.children).toHaveLength(7);
  });

  it('first child is paragraph with id "paragraph"', () => {
    const item = headingPlugin.getToolbarItems!(schema)[0];
    expect(item.children![0].id).toBe('paragraph');
  });

  it.each([1, 2, 3, 4, 5, 6])('child heading%i has correct id and tooltip', (level) => {
    const item = headingPlugin.getToolbarItems!(schema)[0];
    const child = item.children!.find((c: ToolbarItem) => c.id === `heading${level}`)!;
    expect(child).toBeDefined();
    expect(child.tooltip).toContain(`Heading ${level}`);
  });

  it.each([1, 2, 3, 4, 5, 6])('heading%i child has iconHtml with H%i label', (level) => {
    const item = headingPlugin.getToolbarItems!(schema)[0];
    const child = item.children!.find((c: ToolbarItem) => c.id === `heading${level}`)!;
    expect(child.iconHtml).toContain(`H${level}`);
  });

  it('paragraph child has iconHtml with pilcrow (¶)', () => {
    const item = headingPlugin.getToolbarItems!(schema)[0];
    const paraChild = item.children!.find((c: ToolbarItem) => c.id === 'paragraph')!;
    expect(paraChild.iconHtml).toContain('¶');
  });

  it.each([1, 2, 3, 4, 5, 6])('heading%i child command converts to H%i', (level) => {
    const item = headingPlugin.getToolbarItems!(schema)[0];
    const child = item.children!.find((c: ToolbarItem) => c.id === `heading${level}`)!;
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, child.command!)!;
    expect(next.doc.firstChild!.attrs.level).toBe(level);
  });

  it('paragraph child command converts heading back to paragraph', () => {
    const item = headingPlugin.getToolbarItems!(schema)[0];
    const paraChild = item.children!.find((c: ToolbarItem) => c.id === 'paragraph')!;
    const state = createState(doc(schema, h(1, 'hello')), POS_IN_HEADING);
    const next = applyCommand(state, paraChild.command!)!;
    expect(next.doc.firstChild!.type.name).toBe('paragraph');
  });
});

// ---------------------------------------------------------------------------
// Input rule regex
// ---------------------------------------------------------------------------

describe('heading input rule regex', () => {
  const headingRule = /^#+\s$/;

  it.each([
    ['# ', 1],
    ['## ', 2],
    ['### ', 3],
    ['#### ', 4],
    ['##### ', 5],
    ['###### ', 6],
  ])('"%s" matches rule and produces level %i', (input, level) => {
    expect(headingRule.test(input)).toBe(true);
    // Level = number of '#' chars = match[0].length - 1 (space)
    const match = input.match(headingRule)!;
    expect(match[0].length - 1).toBe(level);
  });

  it('does not match "#" without trailing space', () => {
    expect(headingRule.test('#')).toBe(false);
  });

  it('does not match "##" without trailing space', () => {
    expect(headingRule.test('##')).toBe(false);
  });

  it('does not match plain text', () => {
    expect(headingRule.test('hello')).toBe(false);
  });

  it('does not match "#text" (no space separator)', () => {
    expect(headingRule.test('#text')).toBe(false);
  });

  it('level formula: match[0].length - 1 gives correct level', () => {
    expect('## '.match(headingRule)![0].length - 1).toBe(2);
    expect('### '.match(headingRule)![0].length - 1).toBe(3);
    expect('###### '.match(headingRule)![0].length - 1).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Heading with attributes
// ---------------------------------------------------------------------------

describe('heading with attributes', () => {
  it('heading stores align attribute correctly', () => {
    const node = schema.node('heading', { level: 1, align: 'center' }, schema.text('title'));
    expect(node.attrs.align).toBe('center');
    expect(node.attrs.level).toBe(1);
  });

  it('heading toDOM includes style when align is set', () => {
    const node = schema.node('heading', { level: 2, align: 'right' }, schema.text('title'));
    const dom = (schema.nodes.heading.spec.toDOM as Function)(node) as any[];
    expect(dom[1].style).toBe('text-align: right');
  });

  it('bold inside heading is preserved', () => {
    const boldText = schema.text('bold', [schema.marks.strong.create()]);
    const headingNode = h(1, boldText);
    expect(schema.marks.strong.isInSet(headingNode.firstChild!.marks)).not.toBeUndefined();
  });

  it('italic inside heading is preserved', () => {
    const italicText = schema.text('italic', [schema.marks.em.create()]);
    const headingNode = h(2, italicText);
    expect(schema.marks.em.isInSet(headingNode.firstChild!.marks)).not.toBeUndefined();
  });

  it('underline inside heading is preserved', () => {
    const underlineText = schema.text('underline', [schema.marks.underline.create()]);
    const headingNode = h(3, underlineText);
    expect(schema.marks.underline.isInSet(headingNode.firstChild!.marks)).not.toBeUndefined();
  });

  it('inline code inside heading is preserved', () => {
    const codeText = schema.text('code', [schema.marks.code.create()]);
    const headingNode = h(1, codeText);
    expect(schema.marks.code.isInSet(headingNode.firstChild!.marks)).not.toBeUndefined();
  });

  it('text color mark inside heading is preserved', () => {
    const colorText = schema.text('colored', [schema.marks.textColor.create({ color: '#FF0000' })]);
    const headingNode = h(2, colorText);
    expect(schema.marks.textColor.isInSet(headingNode.firstChild!.marks)).not.toBeUndefined();
  });

  it('setBlockType(heading) preserves bold mark', () => {
    const boldText = schema.text('hello', [schema.marks.strong.create()]);
    const state = createState(doc(schema, p(schema, boldText)), 2);
    const next = applyCommand(state, setBlockType(schema.nodes.heading, { level: 1 }))!;
    const textNode = next.doc.firstChild!.firstChild!;
    expect(schema.marks.strong.isInSet(textNode.marks)).not.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Block conversions
// ---------------------------------------------------------------------------

describe('block conversions', () => {
  it('paragraph → H2 → paragraph (round-trip)', () => {
    const state1 = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const state2 = applyCommand(state1, setBlockType(schema.nodes.heading, { level: 2 }))!;
    expect(state2.doc.firstChild!.type.name).toBe('heading');
    const state3 = applyCommand(
      createState(state2.doc, POS_IN_HEADING),
      setBlockType(schema.nodes.paragraph),
    )!;
    expect(state3.doc.firstChild!.type.name).toBe('paragraph');
    expect(state3.doc.textContent).toBe('hello');
  });

  it('H1 → H3 → H6: multiple level changes preserve text', () => {
    const state1 = createState(doc(schema, h(1, 'title')), POS_IN_HEADING);
    const state2 = applyCommand(state1, setBlockType(schema.nodes.heading, { level: 3 }))!;
    const state3 = applyCommand(
      createState(state2.doc, POS_IN_HEADING),
      setBlockType(schema.nodes.heading, { level: 6 }),
    )!;
    expect(state3.doc.firstChild!.attrs.level).toBe(6);
    expect(state3.doc.textContent).toBe('title');
  });

  it('multiple headings in document maintain independence', () => {
    const multiDoc = doc(schema, h(1, 'Title'), h(2, 'Subtitle'), p(schema, text(schema, 'body')));
    expect(multiDoc.childCount).toBe(3);
    expect(multiDoc.child(0).attrs.level).toBe(1);
    expect(multiDoc.child(1).attrs.level).toBe(2);
    expect(multiDoc.child(2).type.name).toBe('paragraph');
  });

  it('setBlockType on heading does not affect sibling blocks', () => {
    const state = createState(
      doc(schema, h(1, 'title'), p(schema, text(schema, 'body'))),
      POS_IN_HEADING,
    );
    const next = applyCommand(state, setBlockType(schema.nodes.heading, { level: 3 }))!;
    expect(next.doc.child(0).attrs.level).toBe(3);
    expect(next.doc.child(1).type.name).toBe('paragraph');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('heading edge cases', () => {
  it('empty heading (no text) is valid', () => {
    const docNode = doc(schema, schema.node('heading', { level: 1 }));
    expect(docNode.firstChild!.type.name).toBe('heading');
    expect(docNode.textContent).toBe('');
  });

  it('heading at document start is valid', () => {
    const docNode = doc(schema, h(1, 'Title'), p(schema, text(schema, 'body')));
    expect(docNode.firstChild!.type.name).toBe('heading');
  });

  it('heading at document end is valid', () => {
    const docNode = doc(schema, p(schema, text(schema, 'body')), h(1, 'Appendix'));
    expect(docNode.lastChild!.type.name).toBe('heading');
  });

  it('schema has heading node type defined', () => {
    expect(schema.nodes.heading).toBeDefined();
  });

  it('setBlockType on heading does not throw for empty doc', () => {
    const state = EditorState.create({ schema });
    expect(() => canExecute(state, setBlockType(schema.nodes.heading, { level: 1 }))).not.toThrow();
  });

  it('heading level 1 through 6 are all creatable', () => {
    [1, 2, 3, 4, 5, 6].forEach(level => {
      expect(() => schema.node('heading', { level }, schema.text('test'))).not.toThrow();
    });
  });

  it('applying bold inside heading works', () => {
    const state = createStateWithSelection(
      doc(schema, h(1, 'hello')),
      2, 6,
    );
    const { toggleMark } = require('prosemirror-commands');
    const next = applyCommand(state, toggleMark(schema.marks.strong));
    expect(next).not.toBeNull();
    expect(next!.doc.textContent).toBe('hello');
  });

  it('applying textColor inside heading works', () => {
    const state = createStateWithSelection(
      doc(schema, h(2, 'hello')),
      2, 6,
    );
    const next = applyCommand(state, setTextColor('#EF4444'));
    expect(next).not.toBeNull();
    expect(next!.doc.textContent).toBe('hello');
    const check = createState(next!.doc, 3);
    const toolbarItem = headingPlugin.getToolbarItems!(schema)[0];
    // Still in heading after color apply
    expect(toolbarItem.isActive!(check)).toBe(true);
  });

  it('getKeymap returns keymap with Mod-Alt-0 through Mod-Alt-6', () => {
    const keymap = headingPlugin.getKeymap!(schema);
    expect(keymap['Mod-Alt-0']).toBeDefined();
    for (let level = 1; level <= 6; level++) {
      expect(keymap[`Mod-Alt-${level}`]).toBeDefined();
    }
  });

  it('Mod-Alt-0 command converts heading to paragraph', () => {
    const keymap = headingPlugin.getKeymap!(schema);
    const state = createState(doc(schema, h(2, 'hello')), POS_IN_HEADING);
    const next = applyCommand(state, keymap['Mod-Alt-0'])!;
    expect(next.doc.firstChild!.type.name).toBe('paragraph');
    expect(next.doc.textContent).toBe('hello');
  });

  it.each([1, 2, 3, 4, 5, 6])('Mod-Alt-%i command converts to H%i', (level) => {
    const keymap = headingPlugin.getKeymap!(schema);
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, keymap[`Mod-Alt-${level}`])!;
    expect(next.doc.firstChild!.attrs.level).toBe(level);
  });
});
