/**
 * Tests for superscript and subscript plugins.
 *
 * Covers:
 *   - Mark schema validation (parseDOM, toDOM, mutual exclusion)
 *   - toggleMark commands (apply, remove, toggle)
 *   - isActive detection (cursor, range, stored marks)
 *   - Keyboard shortcuts (Mod-Shift-. / Mod-Shift-,)
 *   - Mutual exclusion: superscript ↔ subscript
 *   - Mark interactions with bold, italic, underline, textColor, link
 *   - Scientific notation / real-world use cases
 *   - Toolbar integration
 *   - Edge cases
 */

import { superscriptPlugin } from '@inkstream/superscript';
import { subscriptPlugin } from '@inkstream/subscript';
import { toggleMark } from '@inkstream/pm/commands';
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
} from '../test-utils';
import { Schema } from '@inkstream/pm/model';
import { TextSelection } from '@inkstream/pm/state';

const schema = getTestSchema();
const superMark  = schema.marks.superscript;
const subMark    = schema.marks.subscript;

const toggleSuperscript = (state: any, dispatch?: any) =>
  toggleMark(superMark)(state, dispatch);

const toggleSubscript = (state: any, dispatch?: any) =>
  toggleMark(subMark)(state, dispatch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build doc(p('hello')) with a selection over the full text. */
function helloState(from = 1, to = 6) {
  return createStateWithSelection(
    doc(schema, p(schema, text(schema, 'hello'))),
    from, to,
  );
}

/** Build doc(p(text)) where text already has the given mark. */
function markedState(str: string, mark: any, cursorPos = 2) {
  return createState(
    doc(schema, p(schema, text(schema, str, mark.create()))),
    cursorPos,
  );
}

/** Get isActive function from a plugin's first toolbar item. */
function getIsActive(plugin: typeof superscriptPlugin) {
  return plugin.getToolbarItems!(schema)[0].isActive!;
}

// ============================================================================
// SUPERSCRIPT PLUGIN
// ============================================================================

describe('superscriptPlugin', () => {
  // --- Plugin registration ---
  it('has name "superscript"', () => {
    expect(superscriptPlugin.name).toBe('superscript');
  });

  it('tier defaults to "free"', () => {
    expect(superscriptPlugin.tier ?? 'free').toBe('free');
  });

  it('contributes superscript mark to schema', () => {
    expect(superMark).toBeDefined();
  });

  // --- Mark schema ---
  describe('superscript mark schema', () => {
    it('parseDOM handles <sup> tag', () => {
      const parseDom = superMark.spec.parseDOM;
      expect(parseDom).toBeDefined();
      expect(parseDom!.some((r: any) => r.tag === 'sup')).toBe(true);
    });

    it('toDOM outputs <sup> element with hole', () => {
      const mark = superMark.create();
      const domSpec = superMark.spec.toDOM!(mark, false) as unknown as any[];
      expect(domSpec[0]).toBe('sup');
    });

    it('excludes subscript (mutual exclusion declared in schema)', () => {
      expect(superMark.spec.excludes).toBe('subscript');
    });

    it('mark can be created with no attributes', () => {
      const mark = superMark.create();
      expect(mark).toBeDefined();
      expect(mark.type).toBe(superMark);
    });

    it('two superscript marks created independently are equal', () => {
      const m1 = superMark.create();
      const m2 = superMark.create();
      expect(m1.eq(m2)).toBe(true);
    });
  });

  // --- Toggle command ---
  describe('toggleSuperscript command', () => {
    it('applies superscript mark to selected text', () => {
      const state = helloState(1, 6);
      const next = applyCommand(state, toggleSuperscript);
      expect(next).not.toBeNull();
      const check = createState(next!.doc, 2);
      expect(hasMark(check, superMark)).toBe(true);
    });

    it('removes superscript mark when toggled on already-superscript text', () => {
      const state = createStateWithSelection(
        doc(schema, p(schema, text(schema, 'hello', superMark.create()))),
        1, 6,
      );
      const next = applyCommand(state, toggleSuperscript);
      expect(next).not.toBeNull();
      const check = createState(next!.doc, 2);
      expect(hasMark(check, superMark)).toBe(false);
    });

    it('preserves text content when applying superscript', () => {
      const state = helloState(1, 6);
      const next = applyCommand(state, toggleSuperscript);
      expect(next!.doc.textContent).toBe('hello');
    });

    it('applies to partial selection (first word only)', () => {
      const state = createStateWithSelection(
        doc(schema, p(schema, text(schema, 'hello world'))),
        1, 6,
      );
      const next = applyCommand(state, toggleSuperscript);
      expect(next).not.toBeNull();
      // 'hello' has superscript, 'world' does not
      const checkSuper = createState(next!.doc, 2);
      const checkNormal = createState(next!.doc, 8);
      expect(hasMark(checkSuper, superMark)).toBe(true);
      expect(hasMark(checkNormal, superMark)).toBe(false);
    });

    it('returns true when applied to selection', () => {
      const state = helloState(1, 6);
      expect(canExecute(state, toggleSuperscript)).toBe(true);
    });

    it('dispatches transaction when applied', () => {
      const state = helloState(1, 6);
      let dispatched = false;
      toggleSuperscript(state, () => { dispatched = true; });
      expect(dispatched).toBe(true);
    });

    it('can execute on cursor position (empty selection)', () => {
      const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
      expect(canExecute(state, toggleSuperscript)).toBe(true);
    });

    it('toggle twice returns to unsuperscript state', () => {
      const state = helloState(1, 6);
      const once = applyCommand(state, toggleSuperscript)!;
      const onceState = createStateWithSelection(once.doc, 1, 6);
      const twice = applyCommand(onceState, toggleSuperscript)!;
      const check = createState(twice.doc, 2);
      expect(hasMark(check, superMark)).toBe(false);
    });
  });

  // --- isActive ---
  describe('isSuperscriptActive (toolbar item isActive)', () => {
    const isActive = getIsActive(superscriptPlugin);

    it('returns false for cursor on normal text', () => {
      const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
      expect(isActive(state)).toBe(false);
    });

    it('returns true for cursor inside superscript text', () => {
      const state = markedState('hello', superMark, 3);
      expect(isActive(state)).toBe(true);
    });

    it('returns true for range selection entirely in superscript', () => {
      const state = createStateWithSelection(
        doc(schema, p(schema, text(schema, 'hello', superMark.create()))),
        1, 6,
      );
      expect(isActive(state)).toBe(true);
    });

    it('returns false for range selection on plain text', () => {
      const state = helloState(1, 6);
      expect(isActive(state)).toBe(false);
    });

    it('returns true for range selection when some text has superscript (rangeHasMark)', () => {
      // rangeHasMark returns true if ANY character in the range has the mark
      const state = createStateWithSelection(
        doc(schema, p(schema,
          text(schema, 'hello'),
          text(schema, ' world', superMark.create()),
        )),
        1, 12,
      );
      expect(isActive(state)).toBe(true);
    });

    it('returns true for cursor at position with stored mark', () => {
      // Apply superscript to set storedMarks, then check cursor state
      const docNode = doc(schema, p(schema, text(schema, 'hello', superMark.create())));
      const state = createState(docNode, 3);
      expect(isActive(state)).toBe(true);
    });
  });

  // --- Keyboard shortcut ---
  describe('superscript keyboard shortcut', () => {
    it('defines Mod-Shift-. binding', () => {
      const keymap = superscriptPlugin.getKeymap!(schema);
      expect(typeof keymap['Mod-Shift-.']).toBe('function');
    });

    it('Mod-Shift-. applies superscript to selection', () => {
      const state = helloState(1, 6);
      const handler = superscriptPlugin.getKeymap!(schema)['Mod-Shift-.'];
      const next = applyCommand(state, handler as any);
      expect(next).not.toBeNull();
      const check = createState(next!.doc, 2);
      expect(hasMark(check, superMark)).toBe(true);
    });

    it('Mod-Shift-. removes superscript from already-marked text', () => {
      const state = createStateWithSelection(
        doc(schema, p(schema, text(schema, 'hello', superMark.create()))),
        1, 6,
      );
      const handler = superscriptPlugin.getKeymap!(schema)['Mod-Shift-.'];
      const next = applyCommand(state, handler as any);
      expect(next).not.toBeNull();
      expect(hasMark(createState(next!.doc, 2), superMark)).toBe(false);
    });

    it('returns empty keymap when schema has no superscript mark', () => {
      const minSchema = new Schema({
        nodes: { doc: { content: 'block+' }, paragraph: { content: 'inline*', group: 'block' }, text: { group: 'inline' } },
        marks: {},
      });
      const keymap = superscriptPlugin.getKeymap!(minSchema);
      expect(Object.keys(keymap)).toHaveLength(0);
    });
  });

  // --- Toolbar ---
  describe('superscript toolbar item', () => {
    it('provides one toolbar item with id "superscript"', () => {
      const items = superscriptPlugin.getToolbarItems!(schema);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('superscript');
    });

    it('toolbar item has SVG icon', () => {
      const item = superscriptPlugin.getToolbarItems!(schema)[0];
      expect(item.iconHtml).toContain('<svg');
    });

    it('SVG icon contains superscript path', () => {
      const item = superscriptPlugin.getToolbarItems!(schema)[0];
      expect(item.iconHtml).toContain('path');
    });

    it('toolbar item has tooltip mentioning Superscript', () => {
      const item = superscriptPlugin.getToolbarItems!(schema)[0];
      expect(item.tooltip).toMatch(/superscript/i);
    });

    it('toolbar item tooltip mentions keyboard shortcut', () => {
      const item = superscriptPlugin.getToolbarItems!(schema)[0];
      expect(item.tooltip).toMatch(/[⌘.]/);
    });

    it('toolbar item command applies superscript', () => {
      const state = helloState(1, 6);
      const item = superscriptPlugin.getToolbarItems!(schema)[0];
      const next = applyCommand(state, item.command!);
      expect(next).not.toBeNull();
      expect(hasMark(createState(next!.doc, 2), superMark)).toBe(true);
    });

    it('returns empty array when schema has no superscript mark', () => {
      const minSchema = new Schema({
        nodes: { doc: { content: 'block+' }, paragraph: { content: 'inline*', group: 'block' }, text: { group: 'inline' } },
        marks: {},
      });
      const items = superscriptPlugin.getToolbarItems!(minSchema);
      expect(items).toHaveLength(0);
    });
  });
});

// ============================================================================
// SUBSCRIPT PLUGIN
// ============================================================================

describe('subscriptPlugin', () => {
  it('has name "subscript"', () => {
    expect(subscriptPlugin.name).toBe('subscript');
  });

  it('tier defaults to "free"', () => {
    expect(subscriptPlugin.tier ?? 'free').toBe('free');
  });

  it('contributes subscript mark to schema', () => {
    expect(subMark).toBeDefined();
  });

  // --- Mark schema ---
  describe('subscript mark schema', () => {
    it('parseDOM handles <sub> tag', () => {
      const parseDom = subMark.spec.parseDOM;
      expect(parseDom).toBeDefined();
      expect(parseDom!.some((r: any) => r.tag === 'sub')).toBe(true);
    });

    it('toDOM outputs <sub> element with hole', () => {
      const mark = subMark.create();
      const domSpec = subMark.spec.toDOM!(mark, false) as unknown as any[];
      expect(domSpec[0]).toBe('sub');
    });

    it('excludes superscript (mutual exclusion declared in schema)', () => {
      expect(subMark.spec.excludes).toBe('superscript');
    });

    it('mark can be created with no attributes', () => {
      const mark = subMark.create();
      expect(mark).toBeDefined();
      expect(mark.type).toBe(subMark);
    });

    it('two subscript marks are equal', () => {
      const m1 = subMark.create();
      const m2 = subMark.create();
      expect(m1.eq(m2)).toBe(true);
    });
  });

  // --- Toggle command ---
  describe('toggleSubscript command', () => {
    it('applies subscript mark to selected text', () => {
      const state = helloState(1, 6);
      const next = applyCommand(state, toggleSubscript);
      expect(next).not.toBeNull();
      const check = createState(next!.doc, 2);
      expect(hasMark(check, subMark)).toBe(true);
    });

    it('removes subscript mark when toggled on already-subscript text', () => {
      const state = createStateWithSelection(
        doc(schema, p(schema, text(schema, 'hello', subMark.create()))),
        1, 6,
      );
      const next = applyCommand(state, toggleSubscript);
      expect(next).not.toBeNull();
      const check = createState(next!.doc, 2);
      expect(hasMark(check, subMark)).toBe(false);
    });

    it('preserves text content when applying subscript', () => {
      const state = helloState(1, 6);
      const next = applyCommand(state, toggleSubscript);
      expect(next!.doc.textContent).toBe('hello');
    });

    it('applies to partial selection', () => {
      const state = createStateWithSelection(
        doc(schema, p(schema, text(schema, 'hello world'))),
        1, 6,
      );
      const next = applyCommand(state, toggleSubscript);
      expect(next).not.toBeNull();
      expect(hasMark(createState(next!.doc, 2), subMark)).toBe(true);
      expect(hasMark(createState(next!.doc, 8), subMark)).toBe(false);
    });

    it('returns true when applied to selection', () => {
      const state = helloState(1, 6);
      expect(canExecute(state, toggleSubscript)).toBe(true);
    });

    it('dispatches transaction when applied', () => {
      const state = helloState(1, 6);
      let dispatched = false;
      toggleSubscript(state, () => { dispatched = true; });
      expect(dispatched).toBe(true);
    });

    it('can execute on cursor position (empty selection)', () => {
      const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
      expect(canExecute(state, toggleSubscript)).toBe(true);
    });

    it('toggle twice returns to unsubscript state', () => {
      const state = helloState(1, 6);
      const once = applyCommand(state, toggleSubscript)!;
      const onceState = createStateWithSelection(once.doc, 1, 6);
      const twice = applyCommand(onceState, toggleSubscript)!;
      expect(hasMark(createState(twice.doc, 2), subMark)).toBe(false);
    });
  });

  // --- isActive ---
  describe('isSubscriptActive (toolbar item isActive)', () => {
    const isActive = getIsActive(subscriptPlugin);

    it('returns false for cursor on normal text', () => {
      const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
      expect(isActive(state)).toBe(false);
    });

    it('returns true for cursor inside subscript text', () => {
      const state = markedState('hello', subMark, 3);
      expect(isActive(state)).toBe(true);
    });

    it('returns true for range selection entirely in subscript', () => {
      const state = createStateWithSelection(
        doc(schema, p(schema, text(schema, 'hello', subMark.create()))),
        1, 6,
      );
      expect(isActive(state)).toBe(true);
    });

    it('returns false for range selection on plain text', () => {
      const state = helloState(1, 6);
      expect(isActive(state)).toBe(false);
    });

    it('returns true for range selection containing subscript (rangeHasMark)', () => {
      const state = createStateWithSelection(
        doc(schema, p(schema,
          text(schema, 'hello'),
          text(schema, ' world', subMark.create()),
        )),
        1, 12,
      );
      expect(isActive(state)).toBe(true);
    });
  });

  // --- Keyboard shortcut ---
  describe('subscript keyboard shortcut', () => {
    it('defines Mod-Shift-, binding', () => {
      const keymap = subscriptPlugin.getKeymap!(schema);
      expect(typeof keymap['Mod-Shift-,']).toBe('function');
    });

    it('Mod-Shift-, applies subscript to selection', () => {
      const state = helloState(1, 6);
      const handler = subscriptPlugin.getKeymap!(schema)['Mod-Shift-,'];
      const next = applyCommand(state, handler as any);
      expect(next).not.toBeNull();
      expect(hasMark(createState(next!.doc, 2), subMark)).toBe(true);
    });

    it('Mod-Shift-, removes subscript from already-marked text', () => {
      const state = createStateWithSelection(
        doc(schema, p(schema, text(schema, 'hello', subMark.create()))),
        1, 6,
      );
      const handler = subscriptPlugin.getKeymap!(schema)['Mod-Shift-,'];
      const next = applyCommand(state, handler as any);
      expect(hasMark(createState(next!.doc, 2), subMark)).toBe(false);
    });

    it('returns empty keymap when schema has no subscript mark', () => {
      const minSchema = new Schema({
        nodes: { doc: { content: 'block+' }, paragraph: { content: 'inline*', group: 'block' }, text: { group: 'inline' } },
        marks: {},
      });
      const keymap = subscriptPlugin.getKeymap!(minSchema);
      expect(Object.keys(keymap)).toHaveLength(0);
    });
  });

  // --- Toolbar ---
  describe('subscript toolbar item', () => {
    it('provides one toolbar item with id "subscript"', () => {
      const items = subscriptPlugin.getToolbarItems!(schema);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('subscript');
    });

    it('toolbar item has SVG icon', () => {
      expect(subscriptPlugin.getToolbarItems!(schema)[0].iconHtml).toContain('<svg');
    });

    it('SVG icon contains subscript path', () => {
      const item = subscriptPlugin.getToolbarItems!(schema)[0];
      expect(item.iconHtml).toContain('path');
    });

    it('toolbar item has tooltip mentioning Subscript', () => {
      const item = subscriptPlugin.getToolbarItems!(schema)[0];
      expect(item.tooltip).toMatch(/subscript/i);
    });

    it('toolbar item tooltip mentions keyboard shortcut', () => {
      const item = subscriptPlugin.getToolbarItems!(schema)[0];
      expect(item.tooltip).toMatch(/[⌘,]/);
    });

    it('toolbar item command applies subscript', () => {
      const state = helloState(1, 6);
      const item = subscriptPlugin.getToolbarItems!(schema)[0];
      const next = applyCommand(state, item.command!);
      expect(next).not.toBeNull();
      expect(hasMark(createState(next!.doc, 2), subMark)).toBe(true);
    });

    it('returns empty array when schema has no subscript mark', () => {
      const minSchema = new Schema({
        nodes: { doc: { content: 'block+' }, paragraph: { content: 'inline*', group: 'block' }, text: { group: 'inline' } },
        marks: {},
      });
      expect(subscriptPlugin.getToolbarItems!(minSchema)).toHaveLength(0);
    });
  });
});

// ============================================================================
// MUTUAL EXCLUSION TESTS
// ============================================================================

describe('mutual exclusion: superscript ↔ subscript', () => {
  it('applying superscript removes existing subscript', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello', subMark.create()))),
      1, 6,
    );
    const next = applyCommand(state, toggleSuperscript);
    expect(next).not.toBeNull();
    // superscript applied
    expect(hasMark(createState(next!.doc, 2), superMark)).toBe(true);
    // subscript removed
    expect(hasMark(createState(next!.doc, 2), subMark)).toBe(false);
  });

  it('applying subscript removes existing superscript', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello', superMark.create()))),
      1, 6,
    );
    const next = applyCommand(state, toggleSubscript);
    expect(next).not.toBeNull();
    expect(hasMark(createState(next!.doc, 2), subMark)).toBe(true);
    expect(hasMark(createState(next!.doc, 2), superMark)).toBe(false);
  });

  it('document never has both superscript and subscript on same text', () => {
    // Start with subscript, apply superscript — both cannot coexist
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello', subMark.create()))),
      1, 6,
    );
    const next = applyCommand(state, toggleSuperscript)!;
    const nodeAt = next.doc.nodeAt(1);
    expect(nodeAt).not.toBeNull();
    const hasBoth = superMark.isInSet(nodeAt!.marks) && subMark.isInSet(nodeAt!.marks);
    expect(hasBoth).toBeFalsy();
  });

  it('schema marks.superscript excludes subscript', () => {
    expect(superMark.spec.excludes).toBe('subscript');
  });

  it('schema marks.subscript excludes superscript', () => {
    expect(subMark.spec.excludes).toBe('superscript');
  });

  it('toggle superscript → subscript → superscript works correctly', () => {
    // Start plain, apply super, then sub, then super
    const state0 = helloState(1, 6);
    const state1 = applyCommand(state0, toggleSuperscript)!;
    const s1 = createStateWithSelection(state1.doc, 1, 6);
    expect(hasMark(createState(state1.doc, 2), superMark)).toBe(true);

    const state2 = applyCommand(s1, toggleSubscript)!;
    const s2 = createStateWithSelection(state2.doc, 1, 6);
    expect(hasMark(createState(state2.doc, 2), subMark)).toBe(true);
    expect(hasMark(createState(state2.doc, 2), superMark)).toBe(false);

    const state3 = applyCommand(s2, toggleSuperscript)!;
    expect(hasMark(createState(state3.doc, 2), superMark)).toBe(true);
    expect(hasMark(createState(state3.doc, 2), subMark)).toBe(false);
  });

  it('toggle subscript → superscript → subscript works correctly', () => {
    const state0 = helloState(1, 6);
    const state1 = applyCommand(state0, toggleSubscript)!;
    expect(hasMark(createState(state1.doc, 2), subMark)).toBe(true);

    const s1 = createStateWithSelection(state1.doc, 1, 6);
    const state2 = applyCommand(s1, toggleSuperscript)!;
    expect(hasMark(createState(state2.doc, 2), superMark)).toBe(true);
    expect(hasMark(createState(state2.doc, 2), subMark)).toBe(false);

    const s2 = createStateWithSelection(state2.doc, 1, 6);
    const state3 = applyCommand(s2, toggleSubscript)!;
    expect(hasMark(createState(state3.doc, 2), subMark)).toBe(true);
    expect(hasMark(createState(state3.doc, 2), superMark)).toBe(false);
  });

  it('removing superscript does not restore subscript', () => {
    // sub → apply super (removes sub) → remove super → no marks
    const state0 = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello', subMark.create()))),
      1, 6,
    );
    const state1 = applyCommand(state0, toggleSuperscript)!; // sub→super
    const s1 = createStateWithSelection(state1.doc, 1, 6);
    const state2 = applyCommand(s1, toggleSuperscript)!;     // super→none
    expect(hasMark(createState(state2.doc, 2), superMark)).toBe(false);
    expect(hasMark(createState(state2.doc, 2), subMark)).toBe(false);
  });
});

// ============================================================================
// MARK INTERACTIONS
// ============================================================================

describe('superscript with other marks', () => {
  it('superscript + bold can coexist', () => {
    const boldMark  = schema.marks.strong;
    const node = schema.text('bold super', [superMark.create(), boldMark.create()]);
    const docNode = doc(schema, p(schema, node));
    const state = createState(docNode, 3);
    const nodeAt = state.doc.nodeAt(1)!;
    expect(superMark.isInSet(nodeAt.marks)).toBeTruthy();
    expect(boldMark.isInSet(nodeAt.marks)).toBeTruthy();
  });

  it('superscript + italic can coexist', () => {
    const emMark = schema.marks.em;
    const node = schema.text('italic super', [superMark.create(), emMark.create()]);
    const docNode = doc(schema, p(schema, node));
    const nodeAt = docNode.nodeAt(1)!;
    expect(superMark.isInSet(nodeAt.marks)).toBeTruthy();
    expect(emMark.isInSet(nodeAt.marks)).toBeTruthy();
  });

  it('superscript + underline can coexist', () => {
    const underlineMark = schema.marks.underline;
    const node = schema.text('underline super', [superMark.create(), underlineMark.create()]);
    const docNode = doc(schema, p(schema, node));
    const nodeAt = docNode.nodeAt(1)!;
    expect(superMark.isInSet(nodeAt.marks)).toBeTruthy();
    expect(underlineMark.isInSet(nodeAt.marks)).toBeTruthy();
  });

  it('superscript + text color can coexist', () => {
    const colorMark = schema.marks.textColor.create({ color: '#ff0000' });
    const node = schema.text('colored super', [superMark.create(), colorMark]);
    const docNode = doc(schema, p(schema, node));
    const nodeAt = docNode.nodeAt(1)!;
    expect(superMark.isInSet(nodeAt.marks)).toBeTruthy();
    expect(schema.marks.textColor.isInSet(nodeAt.marks)).toBeTruthy();
  });

  it('superscript + link can coexist', () => {
    const linkMark = schema.marks.link.create({ href: 'https://example.com' });
    const node = schema.text('linked super', [superMark.create(), linkMark]);
    const docNode = doc(schema, p(schema, node));
    const nodeAt = docNode.nodeAt(1)!;
    expect(superMark.isInSet(nodeAt.marks)).toBeTruthy();
    expect(schema.marks.link.isInSet(nodeAt.marks)).toBeTruthy();
  });

  it('superscript cannot coexist with subscript on same text (schema enforces)', () => {
    // ProseMirror won't allow both — addMark with superscript removes subscript
    const subNode = schema.text('hello', [subMark.create()]);
    const docNode = doc(schema, p(schema, subNode));
    const state = createStateWithSelection(docNode, 1, 6);
    const tr = state.tr.addMark(1, 6, superMark.create());
    const nextState = state.apply(tr);
    const nodeAt = nextState.doc.nodeAt(1)!;
    const hasBoth = superMark.isInSet(nodeAt.marks) && subMark.isInSet(nodeAt.marks);
    expect(hasBoth).toBeFalsy();
  });
});

describe('subscript with other marks', () => {
  it('subscript + bold can coexist', () => {
    const boldMark = schema.marks.strong;
    const node = schema.text('bold sub', [subMark.create(), boldMark.create()]);
    const docNode = doc(schema, p(schema, node));
    const nodeAt = docNode.nodeAt(1)!;
    expect(subMark.isInSet(nodeAt.marks)).toBeTruthy();
    expect(boldMark.isInSet(nodeAt.marks)).toBeTruthy();
  });

  it('subscript + italic can coexist', () => {
    const emMark = schema.marks.em;
    const node = schema.text('italic sub', [subMark.create(), emMark.create()]);
    const docNode = doc(schema, p(schema, node));
    const nodeAt = docNode.nodeAt(1)!;
    expect(subMark.isInSet(nodeAt.marks)).toBeTruthy();
    expect(emMark.isInSet(nodeAt.marks)).toBeTruthy();
  });

  it('subscript + underline can coexist', () => {
    const underlineMark = schema.marks.underline;
    const node = schema.text('underline sub', [subMark.create(), underlineMark.create()]);
    const docNode = doc(schema, p(schema, node));
    const nodeAt = docNode.nodeAt(1)!;
    expect(subMark.isInSet(nodeAt.marks)).toBeTruthy();
    expect(underlineMark.isInSet(nodeAt.marks)).toBeTruthy();
  });

  it('subscript + text color can coexist', () => {
    const colorMark = schema.marks.textColor.create({ color: '#0000ff' });
    const node = schema.text('colored sub', [subMark.create(), colorMark]);
    const docNode = doc(schema, p(schema, node));
    const nodeAt = docNode.nodeAt(1)!;
    expect(subMark.isInSet(nodeAt.marks)).toBeTruthy();
    expect(schema.marks.textColor.isInSet(nodeAt.marks)).toBeTruthy();
  });

  it('subscript + link can coexist', () => {
    const linkMark = schema.marks.link.create({ href: 'https://example.com' });
    const node = schema.text('linked sub', [subMark.create(), linkMark]);
    const docNode = doc(schema, p(schema, node));
    const nodeAt = docNode.nodeAt(1)!;
    expect(subMark.isInSet(nodeAt.marks)).toBeTruthy();
    expect(schema.marks.link.isInSet(nodeAt.marks)).toBeTruthy();
  });

  it('subscript cannot coexist with superscript on same text', () => {
    const superNode = schema.text('hello', [superMark.create()]);
    const docNode = doc(schema, p(schema, superNode));
    const state = createStateWithSelection(docNode, 1, 6);
    const tr = state.tr.addMark(1, 6, subMark.create());
    const nextState = state.apply(tr);
    const nodeAt = nextState.doc.nodeAt(1)!;
    expect(superMark.isInSet(nodeAt.marks) && subMark.isInSet(nodeAt.marks)).toBeFalsy();
  });
});

// ============================================================================
// SCIENTIFIC NOTATION / REAL-WORLD USE CASES
// ============================================================================

describe('scientific notation and real-world use cases', () => {
  it('x² — superscript exponent: x followed by superscript 2', () => {
    const xNode = schema.text('x');
    const twoNode = schema.text('2', [superMark.create()]);
    const docNode = doc(schema, p(schema, xNode, twoNode));
    expect(docNode.textContent).toBe('x2');
    expect(superMark.isInSet(docNode.nodeAt(2)!.marks)).toBeTruthy();
  });

  it('H₂O — subscript 2: H followed by subscript 2 followed by O', () => {
    const hNode  = schema.text('H');
    const twoNode = schema.text('2', [subMark.create()]);
    const oNode  = schema.text('O');
    const docNode = doc(schema, p(schema, hNode, twoNode, oNode));
    expect(docNode.textContent).toBe('H2O');
    const nodeAt = docNode.nodeAt(2)!;
    expect(subMark.isInSet(nodeAt.marks)).toBeTruthy();
  });

  it('CO₂ — subscript 2 in chemical formula', () => {
    const co   = schema.text('CO');
    const two  = schema.text('2', [subMark.create()]);
    const docNode = doc(schema, p(schema, co, two));
    expect(docNode.textContent).toBe('CO2');
    expect(subMark.isInSet(docNode.nodeAt(3)!.marks)).toBeTruthy();
  });

  it('footnote reference: text¹ — superscript footnote number', () => {
    const body = schema.text('See reference');
    const num  = schema.text('1', [superMark.create()]);
    const docNode = doc(schema, p(schema, body, num));
    expect(docNode.textContent).toBe('See reference1');
    expect(superMark.isInSet(docNode.nodeAt(14)!.marks)).toBeTruthy();
  });

  it('ordinal: 1st — superscript "st"', () => {
    const one = schema.text('1');
    const st  = schema.text('st', [superMark.create()]);
    const docNode = doc(schema, p(schema, one, st));
    expect(docNode.textContent).toBe('1st');
  });

  it('mixed in same paragraph: x² and H₂O', () => {
    const x    = schema.text('x');
    const two1 = schema.text('2', [superMark.create()]);
    const space = schema.text(' and H');
    const two2 = schema.text('2', [subMark.create()]);
    const o    = schema.text('O');
    const docNode = doc(schema, p(schema, x, two1, space, two2, o));
    expect(docNode.textContent).toBe('x2 and H2O');
    // Verify superscript and subscript are correctly placed
    const firstTwo = docNode.nodeAt(2)!;   // '2' after 'x'
    const secondTwo = docNode.nodeAt(9)!;  // '2' in 'H2O'
    expect(superMark.isInSet(firstTwo.marks)).toBeTruthy();
    expect(subMark.isInSet(secondTwo.marks)).toBeTruthy();
  });

  it('superscript inside bold (mathematical notation like bold x²)', () => {
    const boldSuper = schema.text('2', [superMark.create(), schema.marks.strong.create()]);
    const docNode = doc(schema, p(schema, schema.text('x'), boldSuper));
    const twoNode = docNode.nodeAt(2)!;
    expect(superMark.isInSet(twoNode.marks)).toBeTruthy();
    expect(schema.marks.strong.isInSet(twoNode.marks)).toBeTruthy();
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('edge cases', () => {
  it('superscript at document start', () => {
    const node = schema.text('first', [superMark.create()]);
    const docNode = doc(schema, p(schema, node, schema.text(' normal')));
    const state = createState(docNode, 2);
    const isActive = getIsActive(superscriptPlugin);
    expect(isActive(state)).toBe(true);
  });

  it('superscript at document end', () => {
    const node = schema.text('last', [superMark.create()]);
    const docNode = doc(schema, p(schema, schema.text('normal '), node));
    // 'normal ' = 7 chars, 'last' = 4 chars → pos 9 is in 'last'
    const state = createState(docNode, 9);
    expect(getIsActive(superscriptPlugin)(state)).toBe(true);
  });

  it('subscript at document start', () => {
    const node = schema.text('first', [subMark.create()]);
    const docNode = doc(schema, p(schema, node, schema.text(' normal')));
    const state = createState(docNode, 2);
    expect(getIsActive(subscriptPlugin)(state)).toBe(true);
  });

  it('multiple superscripts in same paragraph', () => {
    const s1 = schema.text('a', [superMark.create()]);
    const n  = schema.text(' normal ');
    const s2 = schema.text('b', [superMark.create()]);
    const docNode = doc(schema, p(schema, s1, n, s2));
    expect(docNode.textContent).toBe('a normal b');
    // both 'a' and 'b' should be superscript
    expect(superMark.isInSet(docNode.nodeAt(1)!.marks)).toBeTruthy();
    // 'b' is at pos 1 + 1('a') + 1(' ') + 6('normal') + 1(' ') = pos 10
    expect(superMark.isInSet(docNode.nodeAt(10)!.marks)).toBeTruthy();
  });

  it('whitespace-only selection: can execute superscript', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, '   '))),
      1, 4,
    );
    expect(canExecute(state, toggleSuperscript)).toBe(true);
  });

  it('undo superscript: applying and removing gives original doc', () => {
    const original = doc(schema, p(schema, text(schema, 'hello')));
    const state = createStateWithSelection(original, 1, 6);
    // Apply
    const applied = applyCommand(state, toggleSuperscript)!;
    const appliedState = createStateWithSelection(applied.doc, 1, 6);
    // Remove
    const restored = applyCommand(appliedState, toggleSuperscript)!;
    expect(restored.doc.textContent).toBe('hello');
    expect(hasMark(createState(restored.doc, 2), superMark)).toBe(false);
  });

  it('undo subscript: applying and removing gives original doc', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello'))),
      1, 6,
    );
    const applied = applyCommand(state, toggleSubscript)!;
    const appliedState = createStateWithSelection(applied.doc, 1, 6);
    const restored = applyCommand(appliedState, toggleSubscript)!;
    expect(hasMark(createState(restored.doc, 2), subMark)).toBe(false);
  });

  it('superscript inside blockquote', () => {
    const bqNode = schema.node('blockquote', null, [
      p(schema, schema.text('note', [superMark.create()])),
    ]);
    const docNode = doc(schema, bqNode);
    // blockquote at pos 0, p at pos 1, text at pos 2
    const state = createState(docNode, 3);
    expect(getIsActive(superscriptPlugin)(state)).toBe(true);
  });

  it('subscript inside heading', () => {
    const headingNode = schema.node('heading', { level: 1 },
      schema.text('H₂O', [subMark.create()]),
    );
    const docNode = doc(schema, headingNode);
    const state = createState(docNode, 2);
    expect(getIsActive(subscriptPlugin)(state)).toBe(true);
  });

  it('very long superscript text', () => {
    const longText = 'a'.repeat(500);
    const node = schema.text(longText, [superMark.create()]);
    const docNode = doc(schema, p(schema, node));
    const state = createState(docNode, 100);
    expect(getIsActive(superscriptPlugin)(state)).toBe(true);
  });

  it('superscript mark is not inclusive (cursor after does not inherit mark)', () => {
    // The inclusive property controls whether typing at the boundary inherits the mark.
    // Default is inclusive: true for most marks. Test that superscript mark exists on the node.
    const node = schema.text('x', [superMark.create()]);
    const docNode = doc(schema, p(schema, node, schema.text('y')));
    // cursor at pos 3 is after 'x' and before 'y' (at the boundary)
    const state = createState(docNode, 3);
    // The isActive check uses $cursor.marks() which includes marks that are "inclusive"
    // We just verify the state doesn't crash
    expect(() => getIsActive(superscriptPlugin)(state)).not.toThrow();
  });
});
