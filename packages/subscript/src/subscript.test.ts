import { subscriptPlugin } from './index';
import { superscriptPlugin } from '../../superscript/src';
import { toggleMark } from '@inkstream/pm/commands';
import { Schema } from '@inkstream/pm/model';
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

const schema = getTestSchema();
const subMark = schema.marks.subscript;
const superMark = schema.marks.superscript;
const toggleSubscript = (state: any, dispatch?: any) => toggleMark(subMark)(state, dispatch);

function helloState(from = 1, to = 6) {
  return createStateWithSelection(
    doc(schema, p(schema, text(schema, 'hello'))),
    from, to,
  );
}

describe('subscriptPlugin', () => {
  it('has name "subscript"', () => {
    expect(subscriptPlugin.name).toBe('subscript');
  });

  it('contributes subscript mark to schema', () => {
    expect(subMark).toBeDefined();
  });

  it('parseDOM handles <sub> tags', () => {
    const parseDom = subMark.spec.parseDOM;
    expect(parseDom).toBeDefined();
    expect(parseDom!.some((rule: any) => rule.tag === 'sub')).toBe(true);
  });

  it('toggleSubscript applies the mark to a selection', () => {
    const next = applyCommand(helloState(), toggleSubscript);
    expect(next).not.toBeNull();
    expect(hasMark(createState(next!.doc, 2), subMark)).toBe(true);
  });

  it('toggleSubscript removes the mark when applied twice', () => {
    const once = applyCommand(helloState(), toggleSubscript)!;
    const twice = applyCommand(createStateWithSelection(once.doc, 1, 6), toggleSubscript)!;
    expect(hasMark(createState(twice.doc, 2), subMark)).toBe(false);
  });

  it('can execute with an empty selection', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    expect(canExecute(state, toggleSubscript)).toBe(true);
  });

  it('provides a keyboard shortcut', () => {
    const keymap = subscriptPlugin.getKeymap!(schema);
    expect(typeof keymap['Mod-Shift-,']).toBe('function');
  });

  it('provides a toolbar item', () => {
    const items = subscriptPlugin.getToolbarItems!(schema);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('subscript');
  });

  it('excludes superscript in the schema', () => {
    expect(subMark.spec.excludes).toBe('superscript');
  });

  it('cannot coexist with superscript on the same text', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello', superMark.create()))),
      1, 6,
    );
    const next = applyCommand(state, toggleSubscript)!;
    expect(hasMark(createState(next.doc, 2), subMark)).toBe(true);
    expect(hasMark(createState(next.doc, 2), superMark)).toBe(false);
  });

  it('returns empty keymap when schema has no subscript mark', () => {
    const minSchema = new Schema({
      nodes: { doc: { content: 'block+' }, paragraph: { content: 'inline*', group: 'block' }, text: { group: 'inline' } },
      marks: {},
    });
    expect(Object.keys(subscriptPlugin.getKeymap!(minSchema))).toHaveLength(0);
  });

  it('stays independent from superscript toolbar registration', () => {
    expect(superscriptPlugin.getToolbarItems!(schema)[0].id).toBe('superscript');
    expect(subscriptPlugin.getToolbarItems!(schema)[0].id).toBe('subscript');
  });
});
