import { EditorState, TextSelection } from '@inkstream/pm/state';
import { toggleMark } from '@inkstream/pm/commands';
import { italicPlugin } from './index';
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
const emMark = schema.marks.em;
const toggleItalic = (state: any, dispatch?: any) => toggleMark(emMark)(state, dispatch);

// ---------------------------------------------------------------------------
// Schema definition
// ---------------------------------------------------------------------------

describe('italic schema', () => {
  it('em mark exists in schema', () => {
    expect(schema.marks.em).toBeDefined();
  });

  it('parseDOM includes <em> tag', () => {
    const rules = schema.marks.em.spec.parseDOM as { tag?: string }[];
    expect(rules.some(r => r.tag === 'em')).toBe(true);
  });

  it('parseDOM includes <i> tag', () => {
    const rules = schema.marks.em.spec.parseDOM as { tag?: string }[];
    expect(rules.some(r => r.tag === 'i')).toBe(true);
  });

  it('parseDOM includes font-style=italic style rule', () => {
    const rules = schema.marks.em.spec.parseDOM as { style?: string }[];
    expect(rules.some(r => r.style === 'font-style=italic')).toBe(true);
  });

  it('toDOM outputs <em> element', () => {
    const dom = schema.marks.em.spec.toDOM!(emMark.create(), false);
    expect(Array.isArray(dom) ? dom[0] : dom).toBe('em');
  });
});

// ---------------------------------------------------------------------------
// italicPlugin registration
// ---------------------------------------------------------------------------

describe('italicPlugin', () => {
  it('has the correct plugin name', () => {
    expect(italicPlugin.name).toBe('italic');
  });

  it('provides getKeymap with Mod-i', () => {
    const keymap = italicPlugin.getKeymap!(schema);
    expect(keymap['Mod-i']).toBeDefined();
  });

  it('provides one toolbar item with id "italic"', () => {
    const items = italicPlugin.getToolbarItems!(schema);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('italic');
  });

  it('toolbar item has SVG icon', () => {
    const items = italicPlugin.getToolbarItems!(schema);
    expect(items[0].iconHtml).toContain('<svg');
  });

  it('toolbar item tooltip mentions Ctrl/⌘ + I', () => {
    const items = italicPlugin.getToolbarItems!(schema);
    expect(items[0].tooltip).toMatch(/[⌘I]|Ctrl\+I/i);
  });

  it('toolbar item has isActive function', () => {
    const items = italicPlugin.getToolbarItems!(schema);
    expect(typeof items[0].isActive).toBe('function');
  });

  it('toolbar item has command function', () => {
    const items = italicPlugin.getToolbarItems!(schema);
    expect(typeof items[0].command).toBe('function');
  });

  it('provides getInputRules with 2 rules', () => {
    const rules = italicPlugin.getInputRules!(schema);
    expect(rules).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// toggleItalic command
// ---------------------------------------------------------------------------

describe('toggleItalic', () => {
  it('applies em mark to selected text', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello world'))),
      1, 6,
    );
    const next = applyCommand(state, toggleItalic);
    expect(next).not.toBeNull();
    expect(hasMark(createState(next!.doc, 2), emMark)).toBe(true);
  });

  it('removes em mark when toggled on already-italic text', () => {
    const italicText = text(schema, 'hello', emMark.create());
    const state = createStateWithSelection(
      doc(schema, p(schema, italicText)),
      1, 6,
    );
    const next = applyCommand(state, toggleItalic);
    expect(next).not.toBeNull();
    expect(hasMark(createState(next!.doc, 2), emMark)).toBe(false);
  });

  it('returns true (can execute) for any text selection', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello'))),
      1, 6,
    );
    expect(canExecute(state, toggleItalic)).toBe(true);
  });

  it('dispatches a transaction when applied', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello'))),
      1, 6,
    );
    let dispatched = false;
    toggleItalic(state, () => { dispatched = true; });
    expect(dispatched).toBe(true);
  });

  it('preserves text content when applying italic', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello world'))),
      1, 6,
    );
    const next = applyCommand(state, toggleItalic);
    expect(next!.doc.textContent).toBe('hello world');
  });

  it('applies to partial text selection only', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'say hello please'))),
      5, 10,
    );
    const next = applyCommand(state, toggleItalic);
    expect(next).not.toBeNull();
    expect(next!.doc.textContent).toBe('say hello please');
    // Cursor inside 'hello' should be italic
    expect(hasMark(createState(next!.doc, 6), emMark)).toBe(true);
    // Cursor on 'say' should NOT be italic
    expect(hasMark(createState(next!.doc, 2), emMark)).toBe(false);
  });

  it('returns false when dispatched without selection is still a valid toggle', () => {
    // Collapsed cursor — toggleMark stores mark for next typed char, still returns true
    const state = createState(
      doc(schema, p(schema, text(schema, 'hello'))),
      2,
    );
    expect(canExecute(state, toggleItalic)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isItalicActive via toolbar isActive
// ---------------------------------------------------------------------------

describe('isItalicActive (toolbar isActive)', () => {
  const isActive = italicPlugin.getToolbarItems!(schema)[0].isActive!;

  it('returns false on normal text', () => {
    const state = createState(
      doc(schema, p(schema, text(schema, 'hello'))),
      2,
    );
    expect(isActive(state)).toBe(false);
  });

  it('returns true when cursor is inside italic text', () => {
    const italicText = text(schema, 'hello', emMark.create());
    const state = createState(doc(schema, p(schema, italicText)), 2);
    expect(isActive(state)).toBe(true);
  });

  it('returns true at textOffset=0 (start of italic text)', () => {
    const italicText = text(schema, 'hello', emMark.create());
    const state = createState(doc(schema, p(schema, italicText)), 1);
    expect(isActive(state)).toBe(true);
  });

  it('returns false for cursor before italic span in mixed content', () => {
    const normal = text(schema, 'hi ');
    const italic = text(schema, 'world', emMark.create());
    // pos 2 = inside 'hi ' (textOffset 1)
    const state = createState(doc(schema, p(schema, normal, italic)), 2);
    expect(isActive(state)).toBe(false);
  });

  it('returns true for range selection fully inside italic span', () => {
    const italicText = text(schema, 'hello', emMark.create());
    const state = createStateWithSelection(
      doc(schema, p(schema, italicText)),
      1, 4,
    );
    expect(isActive(state)).toBe(true);
  });

  it('returns false for an empty document', () => {
    const state = EditorState.create({ schema });
    expect(isActive(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Input rules
// ---------------------------------------------------------------------------

describe('italic input rule regex', () => {
  const asteriskRegex = /(?<!\*)\*([^*]+)\*$/;
  const underscoreRegex = /_([^_]+)_$/;

  describe('asterisk rule *text*', () => {
    it('matches single-asterisk wrapped text', () => {
      expect(asteriskRegex.test('*hello*')).toBe(true);
    });

    it('captures inner content in match[1]', () => {
      expect(asteriskRegex.exec('*hello*')?.[1]).toBe('hello');
    });

    it('matches text with spaces inside', () => {
      expect(asteriskRegex.test('*hello world*')).toBe(true);
      expect(asteriskRegex.exec('*hello world*')?.[1]).toBe('hello world');
    });

    it('does NOT match double-asterisk (bold syntax)', () => {
      // Negative lookbehind prevents matching `**text**` as italic
      expect(asteriskRegex.test('**hello**')).toBe(false);
    });

    it('does NOT match unclosed asterisk', () => {
      expect(asteriskRegex.test('*hello')).toBe(false);
    });

    it('does NOT match empty asterisks', () => {
      expect(asteriskRegex.test('**')).toBe(false);
    });
  });

  describe('underscore rule _text_', () => {
    it('matches underscore-wrapped text', () => {
      expect(underscoreRegex.test('_hello_')).toBe(true);
    });

    it('captures inner content in match[1]', () => {
      expect(underscoreRegex.exec('_hello_')?.[1]).toBe('hello');
    });

    it('matches multi-word content', () => {
      expect(underscoreRegex.test('_hello world_')).toBe(true);
    });

    it('does NOT match unclosed underscore', () => {
      expect(underscoreRegex.test('_hello')).toBe(false);
    });

    it('does NOT match double-underscore __text__ (bold)', () => {
      // _([^_]+)_ requires non-underscore chars between delimiters.
      // __hello__ has _ immediately after the first _ — [^_]+ fails.
      // Result: the italic regex correctly does NOT match bold __text__ syntax.
      expect(underscoreRegex.exec('__hello__')).toBeNull();
    });
  });
});

describe('italic input rule transactions', () => {
  it('*text* rule replaces match with italic-marked text', () => {
    const rules = italicPlugin.getInputRules!(schema);
    const asteriskRule = rules[0];
    const docNode = doc(schema, p(schema, text(schema, '*hello*')));
    const state = createState(docNode, 8); // pos after last *
    const match = /(?<!\*)\*([^*]+)\*$/.exec('*hello*')!;

    // Simulate the rule callback: start=1, end=8 (full match in paragraph)
    const tr = (asteriskRule as any).handler(state, match, 1, 8);
    expect(tr).not.toBeNull();
    // Resulting doc should have italic text "hello" without asterisks
    const next = state.apply(tr);
    expect(next.doc.textContent).toBe('hello');
    expect(hasMark(createState(next.doc, 2), emMark)).toBe(true);
  });

  it('_text_ rule replaces match with italic-marked text', () => {
    const rules = italicPlugin.getInputRules!(schema);
    const underscoreRule = rules[1];
    const docNode = doc(schema, p(schema, text(schema, '_hello_')));
    const state = createState(docNode, 8);
    const match = /_([^_]+)_$/.exec('_hello_')!;

    const tr = (underscoreRule as any).handler(state, match, 1, 8);
    expect(tr).not.toBeNull();
    const next = state.apply(tr);
    expect(next.doc.textContent).toBe('hello');
    expect(hasMark(createState(next.doc, 2), emMark)).toBe(true);
  });

  it('rule returns null when match[1] is empty', () => {
    const rules = italicPlugin.getInputRules!(schema);
    const docNode = doc(schema, p(schema, text(schema, '**')));
    const state = createState(docNode, 3);
    const emptyMatch = ['**', ''] as unknown as RegExpExecArray;
    const tr = (rules[0] as any).handler(state, emptyMatch, 1, 3);
    expect(tr).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mark interactions
// ---------------------------------------------------------------------------

describe('italic + other marks', () => {
  it('can combine italic and bold (em + strong)', () => {
    const strongMark = schema.marks.strong;
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello', strongMark.create()))),
      1, 6,
    );
    // Apply italic on top of bold text
    const next = applyCommand(state, toggleItalic);
    expect(next).not.toBeNull();
    const check = createState(next!.doc, 2);
    expect(hasMark(check, emMark)).toBe(true);
    expect(hasMark(check, strongMark)).toBe(true);
  });

  it('can combine italic and underline', () => {
    const underlineMark = schema.marks.underline;
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello', underlineMark.create()))),
      1, 6,
    );
    const next = applyCommand(state, toggleItalic);
    expect(next).not.toBeNull();
    const check = createState(next!.doc, 2);
    expect(hasMark(check, emMark)).toBe(true);
    expect(hasMark(check, underlineMark)).toBe(true);
  });

  it('applying code mark to italic text removes italic (code excludes all)', () => {
    const italicText = text(schema, 'hello', emMark.create());
    const state = createStateWithSelection(
      doc(schema, p(schema, italicText)),
      1, 6,
    );
    const toggleCode = (s: any, d?: any) => toggleMark(schema.marks.code)(s, d);
    const next = applyCommand(state, toggleCode);
    expect(next).not.toBeNull();
    const check = createState(next!.doc, 2);
    // Code mark present
    expect(hasMark(check, schema.marks.code)).toBe(true);
    // Italic excluded
    expect(hasMark(check, emMark)).toBe(false);
  });

  it('italic does not exclude strike', () => {
    const strikeMark = schema.marks.strike;
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello', strikeMark.create()))),
      1, 6,
    );
    const next = applyCommand(state, toggleItalic);
    expect(next).not.toBeNull();
    const check = createState(next!.doc, 2);
    expect(hasMark(check, emMark)).toBe(true);
    expect(hasMark(check, strikeMark)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('italic edge cases', () => {
  it('handles empty document (cursor on default para)', () => {
    const state = EditorState.create({ schema });
    // toggleMark on empty doc should at least not throw
    expect(() => canExecute(state, toggleItalic)).not.toThrow();
  });

  it('double-toggling results in no net change', () => {
    const original = doc(schema, p(schema, text(schema, 'hello')));
    const state1 = createStateWithSelection(original, 1, 6);

    const after1 = applyCommand(state1, toggleItalic)!;
    expect(after1).not.toBeNull();

    const after2 = applyCommand(
      createStateWithSelection(after1.doc, 1, 6),
      toggleItalic,
    );
    expect(after2).not.toBeNull();
    // Mark removed — back to no italic
    expect(hasMark(createState(after2!.doc, 2), emMark)).toBe(false);
  });

  it('applying italic preserves document text content', () => {
    const content = 'The quick brown fox';
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, content))),
      5, 10,
    );
    const next = applyCommand(state, toggleItalic)!;
    expect(next.doc.textContent).toBe(content);
  });

  it('italic at start of paragraph (position 1)', () => {
    const state = createState(
      doc(schema, p(schema, text(schema, 'hello', emMark.create()))),
      1,
    );
    expect(hasMark(state, emMark)).toBe(true);
  });

  it('italic mark spec has no excludes (coexists with other marks)', () => {
    const excludes = (schema.marks.em.spec as any).excludes;
    // Should be undefined or '' — not '_' (which would exclude all marks)
    expect(excludes).not.toBe('_');
  });

  it('applying italic twice (idempotent) does not corrupt document', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello'))),
      1, 6,
    );
    const once = applyCommand(state, toggleItalic)!;
    const onceState = createStateWithSelection(once.doc, 1, 6);
    // Toggle again (removes mark)
    const twice = applyCommand(onceState, toggleItalic)!;
    // Toggle once more (applies mark)
    const thrice = applyCommand(
      createStateWithSelection(twice.doc, 1, 6),
      toggleItalic,
    )!;
    expect(hasMark(createState(thrice.doc, 2), emMark)).toBe(true);
    expect(thrice.doc.textContent).toBe('hello');
  });
});
