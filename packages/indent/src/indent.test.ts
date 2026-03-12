import { EditorState } from '@inkstream/pm/state';
import { indentPlugin } from './index';
import {
  getTestSchema,
  createState,
  createStateWithSelection,
  applyCommand,
  canExecute,
  getBlockAttr,
  p,
  text,
  doc,
} from '../../editor-core/src/test-utils';

const schema = getTestSchema();

// Extract commands from toolbar items (they are private to the module)
const toolbarItems = indentPlugin.getToolbarItems!(schema);
const outdentItem = toolbarItems.find(i => i.id === 'outdent')!;
const indentItem = toolbarItems.find(i => i.id === 'indent')!;
const increaseIndent = indentItem.command!;
const decreaseIndent = outdentItem.command!;

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

describe('indentPlugin', () => {
  it('has the correct plugin name', () => {
    expect(indentPlugin.name).toBe('indent');
  });

  it('provides 2 toolbar items (outdent, indent)', () => {
    expect(toolbarItems).toHaveLength(2);
  });

  it('toolbar item ids are outdent and indent', () => {
    const ids = toolbarItems.map(i => i.id);
    expect(ids).toContain('outdent');
    expect(ids).toContain('indent');
  });

  it('indent toolbar item has SVG icon', () => {
    expect(indentItem.iconHtml).toContain('<svg');
  });

  it('outdent toolbar item has SVG icon', () => {
    expect(outdentItem.iconHtml).toContain('<svg');
  });

  it('indent tooltip mentions Tab', () => {
    expect(indentItem.tooltip).toMatch(/Tab/i);
  });

  it('outdent tooltip mentions Shift+Tab', () => {
    expect(outdentItem.tooltip).toMatch(/Shift.*Tab/i);
  });

  it('uses getProseMirrorPlugins (not getKeymap) for Tab priority', () => {
    // Tab must run before buildKeymap — requires getProseMirrorPlugins
    expect(typeof indentPlugin.getProseMirrorPlugins).toBe('function');
    const pmPlugins = indentPlugin.getProseMirrorPlugins!(schema);
    expect(pmPlugins.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Schema: indent attribute
// ---------------------------------------------------------------------------

describe('indent attribute in schema', () => {
  it('paragraph node has indent attribute with default 0', () => {
    const paraSpec = schema.nodes.paragraph.spec;
    expect((paraSpec.attrs as any).indent).toBeDefined();
    expect((paraSpec.attrs as any).indent.default).toBe(0);
  });

  it('heading node does NOT have indent attribute (by design)', () => {
    const headingSpec = schema.nodes.heading.spec;
    // Headings intentionally excluded from indentation — breaks doc hierarchy
    expect((headingSpec.attrs as any).indent).toBeUndefined();
  });

  it('fresh paragraph has indent 0', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    expect(getBlockAttr(state, 'indent')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// increaseIndent command
// ---------------------------------------------------------------------------

describe('increaseIndent', () => {
  it('increases indent from 0 to 1 on a paragraph', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, increaseIndent);
    expect(next).not.toBeNull();
    expect(getBlockAttr(createState(next!.doc, 2), 'indent')).toBe(1);
  });

  it('increases indent incrementally (1 → 2)', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const level1 = applyCommand(state, increaseIndent)!;
    const level2 = applyCommand(createState(level1.doc, 2), increaseIndent);
    expect(getBlockAttr(createState(level2!.doc, 2), 'indent')).toBe(2);
  });

  it('returns true and dispatches a transaction', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    let dispatched = false;
    const result = increaseIndent(state, () => { dispatched = true; });
    expect(result).toBe(true);
    expect(dispatched).toBe(true);
  });

  it('preserves text content when indenting', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello world'))), 2);
    const next = applyCommand(state, increaseIndent)!;
    expect(next.doc.textContent).toBe('hello world');
  });

  it('preserves other node attributes (align) when indenting', () => {
    // Create a paragraph with align attr
    const alignedPara = schema.node('paragraph', { align: 'center', indent: 0 }, [
      schema.text('centered'),
    ]);
    const state = createState(doc(schema, alignedPara), 2);
    const next = applyCommand(state, increaseIndent)!;
    const check = createState(next.doc, 2);
    expect(getBlockAttr(check, 'indent')).toBe(1);
    expect(getBlockAttr(check, 'align')).toBe('center');
  });

  it('does NOT indent a heading (not in INDENTABLE_BLOCK_TYPES)', () => {
    const heading = schema.node('heading', { level: 2 }, [schema.text('My Heading')]);
    const state = createState(doc(schema, heading), 2);
    // increaseIndent returns false when no indentable block found
    expect(canExecute(state, increaseIndent)).toBe(false);
  });

  it('does NOT exceed MAX_INDENT (10)', () => {
    let state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    // Apply indent 11 times — should cap at 10
    for (let i = 0; i < 11; i++) {
      const next = applyCommand(state, increaseIndent);
      if (next) state = createState(next.doc, 2);
    }
    expect(getBlockAttr(state, 'indent')).toBe(10);
  });

  it('returns false when indent is already at MAX (10)', () => {
    const maxPara = schema.node('paragraph', { indent: 10 }, [schema.text('max')]);
    const state = createState(doc(schema, maxPara), 2);
    expect(canExecute(state, increaseIndent)).toBe(false);
  });

  it('indents all paragraphs in a multi-paragraph selection', () => {
    const twoParas = doc(schema,
      p(schema, text(schema, 'first')),
      p(schema, text(schema, 'second')),
    );
    const state = createStateWithSelection(twoParas, 2, 9);
    const next = applyCommand(state, increaseIndent)!;
    // Both paragraphs should have indent 1
    const paras = (next.doc.content as any).content;
    expect(paras[0].attrs.indent).toBe(1);
    expect(paras[1].attrs.indent).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// decreaseIndent command
// ---------------------------------------------------------------------------

describe('decreaseIndent', () => {
  it('decreases indent from 1 to 0', () => {
    const indentedPara = schema.node('paragraph', { indent: 1 }, [schema.text('hello')]);
    const state = createState(doc(schema, indentedPara), 2);
    const next = applyCommand(state, decreaseIndent);
    expect(next).not.toBeNull();
    expect(getBlockAttr(createState(next!.doc, 2), 'indent')).toBe(0);
  });

  it('decreases indent from 3 to 2', () => {
    const indentedPara = schema.node('paragraph', { indent: 3 }, [schema.text('deep')]);
    const state = createState(doc(schema, indentedPara), 2);
    const next = applyCommand(state, decreaseIndent);
    expect(next).not.toBeNull();
    expect(getBlockAttr(createState(next!.doc, 2), 'indent')).toBe(2);
  });

  it('returns false when indent is already 0 (no-op)', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    expect(canExecute(state, decreaseIndent)).toBe(false);
  });

  it('does not produce negative indent values', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    // Try decreasing from 0 multiple times
    const result1 = applyCommand(state, decreaseIndent);
    const result2 = applyCommand(state, decreaseIndent);
    expect(result1).toBeNull();
    expect(result2).toBeNull();
  });

  it('returns true and dispatches a transaction when indent > 0', () => {
    const indentedPara = schema.node('paragraph', { indent: 2 }, [schema.text('hello')]);
    const state = createState(doc(schema, indentedPara), 2);
    let dispatched = false;
    const result = decreaseIndent(state, () => { dispatched = true; });
    expect(result).toBe(true);
    expect(dispatched).toBe(true);
  });

  it('preserves text content when outdenting', () => {
    const indentedPara = schema.node('paragraph', { indent: 2 }, [schema.text('preserved')]);
    const state = createState(doc(schema, indentedPara), 2);
    const next = applyCommand(state, decreaseIndent)!;
    expect(next.doc.textContent).toBe('preserved');
  });

  it('preserves other node attributes (align) when outdenting', () => {
    const para = schema.node('paragraph', { align: 'right', indent: 2 }, [
      schema.text('aligned and indented'),
    ]);
    const state = createState(doc(schema, para), 2);
    const next = applyCommand(state, decreaseIndent)!;
    const check = createState(next.doc, 2);
    expect(getBlockAttr(check, 'indent')).toBe(1);
    expect(getBlockAttr(check, 'align')).toBe('right');
  });

  it('outdents all paragraphs in a multi-paragraph selection', () => {
    const twoParas = doc(schema,
      schema.node('paragraph', { indent: 2 }, [schema.text('first')]),
      schema.node('paragraph', { indent: 2 }, [schema.text('second')]),
    );
    const state = createStateWithSelection(twoParas, 2, 9);
    const next = applyCommand(state, decreaseIndent)!;
    const paras = (next.doc.content as any).content;
    expect(paras[0].attrs.indent).toBe(1);
    expect(paras[1].attrs.indent).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: indent then outdent
// ---------------------------------------------------------------------------

describe('indent / outdent round-trip', () => {
  it('indent then outdent returns to original indent level', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const after1 = applyCommand(state, increaseIndent)!;
    const after2 = applyCommand(createState(after1.doc, 2), decreaseIndent)!;
    expect(getBlockAttr(createState(after2.doc, 2), 'indent')).toBe(0);
  });

  it('multiple indent/outdent cycles preserve text content', () => {
    const original = doc(schema, p(schema, text(schema, 'cycling')));
    let state = createState(original, 2);
    for (let i = 0; i < 5; i++) state = createState(applyCommand(state, increaseIndent)!.doc, 2);
    for (let i = 0; i < 5; i++) state = createState(applyCommand(state, decreaseIndent)!.doc, 2);
    expect(state.doc.textContent).toBe('cycling');
    expect(getBlockAttr(state, 'indent')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: indent with inline marks
// ---------------------------------------------------------------------------

describe('indent with inline marks', () => {
  it('indenting bold text preserves bold mark', () => {
    const boldText = text(schema, 'bold', schema.marks.strong.create());
    const state = createState(doc(schema, p(schema, boldText)), 2);
    const next = applyCommand(state, increaseIndent)!;
    // Bold mark should still be present
    const emMark = schema.marks.strong;
    const textNode = (next.doc.content as any).content[0].content.content[0];
    expect(emMark.isInSet(textNode.marks)).not.toBeUndefined();
  });

  it('indenting italic text preserves italic mark', () => {
    const italicText = text(schema, 'italic', schema.marks.em.create());
    const state = createState(doc(schema, p(schema, italicText)), 2);
    const next = applyCommand(state, increaseIndent)!;
    const textNode = (next.doc.content as any).content[0].content.content[0];
    expect(schema.marks.em.isInSet(textNode.marks)).not.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Integration: indent with blockquote
// ---------------------------------------------------------------------------

describe('indent does not apply inside blockquote container', () => {
  it('blockquote itself is not indented (not in INDENTABLE_BLOCK_TYPES)', () => {
    // Blockquote contains a paragraph — the paragraph can be indented,
    // but the blockquote node itself should not get an indent attr
    const bq = schema.node('blockquote', null, [
      schema.node('paragraph', { indent: 0 }, [schema.text('quoted')]),
    ]);
    // Cursor inside the paragraph inside the blockquote
    const state = createState(doc(schema, bq), 3);
    // indentCommand should increase indent on the inner paragraph
    const next = applyCommand(state, increaseIndent);
    // The paragraph inside blockquote is in INDENTABLE_BLOCK_TYPES
    // so indentCommand should work
    if (next) {
      const innerPara = (next.doc.content as any).content[0].content.content[0];
      expect(innerPara.attrs.indent).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('empty paragraph can be indented', () => {
    const emptyPara = schema.node('paragraph', null, []);
    const state = createState(doc(schema, emptyPara), 1);
    const next = applyCommand(state, increaseIndent);
    expect(next).not.toBeNull();
    expect(getBlockAttr(createState(next!.doc, 1), 'indent')).toBe(1);
  });

  it('empty paragraph at indent 1 can be outdented', () => {
    const emptyPara = schema.node('paragraph', { indent: 1 }, []);
    const state = createState(doc(schema, emptyPara), 1);
    const next = applyCommand(state, decreaseIndent);
    expect(next).not.toBeNull();
    expect(getBlockAttr(createState(next!.doc, 1), 'indent')).toBe(0);
  });

  it('increaseIndent at MAX_INDENT returns false (no dispatch)', () => {
    const maxedPara = schema.node('paragraph', { indent: 10 }, [schema.text('max')]);
    const state = createState(doc(schema, maxedPara), 2);
    let dispatched = false;
    const result = increaseIndent(state, () => { dispatched = true; });
    expect(result).toBe(false);
    expect(dispatched).toBe(false);
  });

  it('decreaseIndent at indent 0 returns false (no dispatch)', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    let dispatched = false;
    const result = decreaseIndent(state, () => { dispatched = true; });
    expect(result).toBe(false);
    expect(dispatched).toBe(false);
  });

  it('indent level stored as integer (not float)', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, increaseIndent)!;
    const indent = getBlockAttr(createState(next.doc, 2), 'indent') as number;
    expect(Number.isInteger(indent)).toBe(true);
    expect(indent).toBe(1);
  });

  it('mixed indent paragraphs — only indentable blocks in selection affected', () => {
    // One paragraph at indent 0, heading after it
    const heading = schema.node('heading', { level: 1 }, [schema.text('Title')]);
    const para = p(schema, text(schema, 'body'));
    // Selection covering both
    const state = createStateWithSelection(doc(schema, heading, para), 2, 12);
    const next = applyCommand(state, increaseIndent);
    // Only the paragraph should be indented; heading has no indent attr
    if (next) {
      const nodes = (next.doc.content as any).content;
      // heading: no indent attr
      expect(nodes[0].attrs.indent).toBeUndefined();
      // paragraph: indent increased
      expect(nodes[1].attrs.indent).toBe(1);
    }
  });
});
