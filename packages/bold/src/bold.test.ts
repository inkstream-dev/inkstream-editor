import { boldPlugin } from './index';
import {
  getTestSchema,
  createState,
  createStateWithSelection,
  applyCommand,
  canExecute,
  hasMark,
  p,
  text,
  doc,
} from '../../editor-core/src/test-utils';
import { toggleMark } from '@inkstream/pm/commands';

const schema = getTestSchema();
const strongMark = schema.marks.strong;

const toggleBold = (state: any, dispatch?: any) =>
  toggleMark(strongMark)(state, dispatch);

// ---------------------------------------------------------------------------
// boldPlugin registration
// ---------------------------------------------------------------------------

describe('boldPlugin', () => {
  it('has the correct plugin name', () => {
    expect(boldPlugin.name).toBe('bold');
  });

  it('provides a getKeymap with Mod-b', () => {
    const keymap = boldPlugin.getKeymap!(schema);
    expect(keymap['Mod-b']).toBeDefined();
  });

  it('provides one toolbar item with id "bold"', () => {
    const items = boldPlugin.getToolbarItems!(schema);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('bold');
  });

  it('toolbar item has SVG icon', () => {
    const items = boldPlugin.getToolbarItems!(schema);
    expect(items[0].iconHtml).toContain('<svg');
  });

  it('toolbar item tooltip mentions Ctrl/Cmd+B', () => {
    const items = boldPlugin.getToolbarItems!(schema);
    expect(items[0].tooltip).toMatch(/[⌘B]|Ctrl\+B/i);
  });
});

// ---------------------------------------------------------------------------
// Bold toggle command
// ---------------------------------------------------------------------------

describe('bold toggle', () => {
  it('applies strong mark to selected text', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello world'))),
      1, 6,
    );
    const next = applyCommand(state, toggleBold);
    expect(next).not.toBeNull();
    const check = createState(next!.doc, 2);
    expect(hasMark(check, strongMark)).toBe(true);
  });

  it('removes strong mark when toggled on already-bold text', () => {
    const boldText = text(schema, 'hello', strongMark.create());
    const state = createStateWithSelection(
      doc(schema, p(schema, boldText)),
      1, 6,
    );
    const next = applyCommand(state, toggleBold);
    expect(next).not.toBeNull();
    const check = createState(next!.doc, 2);
    expect(hasMark(check, strongMark)).toBe(false);
  });

  it('preserves text content when applying bold', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello'))),
      1, 6,
    );
    const next = applyCommand(state, toggleBold);
    expect(next!.doc.textContent).toBe('hello');
  });

  it('can apply bold to part of a paragraph', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'say hello please'))),
      5, 10,
    );
    const next = applyCommand(state, toggleBold);
    expect(next).not.toBeNull();
    expect(next!.doc.textContent).toBe('say hello please');
  });
});

// ---------------------------------------------------------------------------
// Bold input rule — **text** and __text__
// ---------------------------------------------------------------------------

describe('bold input rule regex', () => {
  it('double-asterisk regex matches **text**', () => {
    const regex = /\*\*([^*]+)\*\*$/;
    expect(regex.test('**hello**')).toBe(true);
    expect(regex.exec('**hello**')?.[1]).toBe('hello');
  });

  it('double-underscore regex matches __text__', () => {
    const regex = /__([^_]+)__$/;
    expect(regex.test('__hello__')).toBe(true);
    expect(regex.exec('__hello__')?.[1]).toBe('hello');
  });

  it('double-asterisk regex does not match single asterisk', () => {
    const regex = /\*\*([^*]+)\*\*$/;
    expect(regex.test('*hello*')).toBe(false);
  });

  it('double-asterisk regex does not match unclosed', () => {
    const regex = /\*\*([^*]+)\*\*$/;
    expect(regex.test('**hello')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isActive via hasMark helper
// ---------------------------------------------------------------------------

describe('bold isActive', () => {
  it('returns false on normal text', () => {
    const state = createState(
      doc(schema, p(schema, text(schema, 'hello'))),
      2,
    );
    expect(hasMark(state, strongMark)).toBe(false);
  });

  it('returns true when cursor is inside bold text', () => {
    const boldText = text(schema, 'hello', strongMark.create());
    const state = createState(doc(schema, p(schema, boldText)), 2);
    expect(hasMark(state, strongMark)).toBe(true);
  });
});
