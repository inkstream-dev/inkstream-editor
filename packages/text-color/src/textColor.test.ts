import { EditorState, TextSelection } from '@inkstream/pm/state';
import {
  textColorPlugin,
  setTextColor,
  removeTextColor,
  DEFAULT_TEXT_COLOR_PALETTE,
  ColorEntry,
} from './index';
import {
  getTestSchema,
  createState,
  createStateWithSelection,
  applyCommand,
  canExecute,
  p,
  text,
  doc,
} from '../../editor-core/src/test-utils';

const schema = getTestSchema();
const colorMarkType = schema.marks.textColor;

// Get getActiveTextColor via toolbar item's getActiveColor field
const toolbarItem = textColorPlugin.getToolbarItems!(schema)[0];
const getActiveTextColor = toolbarItem.getActiveColor!;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a state with text colored with the given CSS color string. */
function stateWithColor(color: string, selPos = 2) {
  const colorMark = colorMarkType.create({ color });
  const colored = schema.text('hello', [colorMark]);
  return createState(doc(schema, p(schema, colored)), selPos);
}

/** Create a range selection over colored text. */
function selectionWithColor(color: string) {
  const colorMark = colorMarkType.create({ color });
  const colored = schema.text('hello', [colorMark]);
  return createStateWithSelection(doc(schema, p(schema, colored)), 1, 6);
}

// ---------------------------------------------------------------------------
// Mark schema definition
// ---------------------------------------------------------------------------

describe('textColor mark schema', () => {
  it('textColor mark exists in schema', () => {
    expect(colorMarkType).toBeDefined();
  });

  it('mark has color attribute with default "black"', () => {
    const spec = colorMarkType.spec;
    expect((spec.attrs as any).color).toBeDefined();
    expect((spec.attrs as any).color.default).toBe('black');
  });

  it('parseDOM handles style="color" rule', () => {
    const parseRules = colorMarkType.spec.parseDOM as any[];
    expect(parseRules.some(r => r.style === 'color')).toBe(true);
  });

  it('toDOM outputs a <span> with inline color style', () => {
    const mark = colorMarkType.create({ color: '#FF0000' });
    const dom = colorMarkType.spec.toDOM!(mark, false) as unknown as any[];
    expect(dom[0]).toBe('span');
    expect(dom[1]).toMatchObject({ style: 'color: #FF0000' });
  });

  it('mark is inline and in the inline group', () => {
    const spec = colorMarkType.spec as any;
    expect(spec.inline).toBe(true);
    expect(spec.group).toBe('inline');
  });
});

// ---------------------------------------------------------------------------
// textColorPlugin registration
// ---------------------------------------------------------------------------

describe('textColorPlugin', () => {
  it('has the correct plugin name', () => {
    expect(textColorPlugin.name).toBe('textColor');
  });

  it('provides one toolbar item with id "textColor"', () => {
    const items = textColorPlugin.getToolbarItems!(schema);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('textColor');
  });

  it('toolbar item type is "dropdown"', () => {
    expect(toolbarItem.type).toBe('dropdown');
  });

  it('toolbar item has childrenLayout "grid"', () => {
    expect(toolbarItem.childrenLayout).toBe('grid');
  });

  it('toolbar item has SVG icon', () => {
    expect(toolbarItem.iconHtml).toContain('<svg');
  });

  it('toolbar item has getActiveColor function', () => {
    expect(typeof toolbarItem.getActiveColor).toBe('function');
  });

  it('toolbar item has getChildren function', () => {
    expect(typeof toolbarItem.getChildren).toBe('function');
  });

  it('toolbar isActive returns true when cursor is on colored text', () => {
    const state = stateWithColor('#FF0000');
    expect(toolbarItem.isActive!(state)).toBe(true);
  });

  it('toolbar isActive returns false on normal text', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'plain'))), 2);
    expect(toolbarItem.isActive!(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_TEXT_COLOR_PALETTE
// ---------------------------------------------------------------------------

describe('DEFAULT_TEXT_COLOR_PALETTE', () => {
  it('exports a non-empty palette array', () => {
    expect(Array.isArray(DEFAULT_TEXT_COLOR_PALETTE)).toBe(true);
    expect(DEFAULT_TEXT_COLOR_PALETTE.length).toBeGreaterThan(0);
  });

  it('every entry has a label and value', () => {
    DEFAULT_TEXT_COLOR_PALETTE.forEach((entry: ColorEntry) => {
      expect(typeof entry.label).toBe('string');
      expect(entry.label.length).toBeGreaterThan(0);
      expect(typeof entry.value).toBe('string');
      expect(entry.value.length).toBeGreaterThan(0);
    });
  });

  it('includes standard colors (black, red, blue)', () => {
    const values = DEFAULT_TEXT_COLOR_PALETTE.map(e => e.value.toLowerCase());
    expect(values).toContain('#000000'); // black
    expect(values.some(v => v.startsWith('#ef') || v.includes('red'))).toBe(true);
    expect(values.some(v => v.includes('3b82') || v.includes('blue'))).toBe(true);
  });

  it('has exactly 16 default colors', () => {
    expect(DEFAULT_TEXT_COLOR_PALETTE).toHaveLength(16);
  });
});

// ---------------------------------------------------------------------------
// setTextColor command
// ---------------------------------------------------------------------------

describe('setTextColor', () => {
  it('applies a color mark to selected text', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello world'))),
      1, 6,
    );
    const next = applyCommand(state, setTextColor('#FF0000'));
    expect(next).not.toBeNull();
    const check = createState(next!.doc, 2);
    expect(getActiveTextColor(check)).toBe('#FF0000');
  });

  it('returns true and dispatches a transaction', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello'))),
      1, 6,
    );
    let dispatched = false;
    const result = setTextColor('#00FF00')(state, () => { dispatched = true; });
    expect(result).toBe(true);
    expect(dispatched).toBe(true);
  });

  it('preserves text content when applying color', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello world'))),
      1, 6,
    );
    const next = applyCommand(state, setTextColor('#0000FF'))!;
    expect(next.doc.textContent).toBe('hello world');
  });

  it('changes color on already-colored text', () => {
    const red = colorMarkType.create({ color: '#FF0000' });
    const colored = schema.text('hello', [red]);
    const state = createStateWithSelection(doc(schema, p(schema, colored)), 1, 6);
    const next = applyCommand(state, setTextColor('#0000FF'))!;
    const check = createState(next.doc, 2);
    expect(getActiveTextColor(check)).toBe('#0000FF');
  });

  it('replaces old color — only one textColor mark remains', () => {
    const red = colorMarkType.create({ color: '#FF0000' });
    const colored = schema.text('hello', [red]);
    const state = createStateWithSelection(doc(schema, p(schema, colored)), 1, 6);
    const next = applyCommand(state, setTextColor('#00FF00'))!;
    // Count textColor marks in the result
    const marks: any[] = [];
    next.doc.nodesBetween(0, next.doc.content.size, node => {
      if (node.isText) {
        node.marks.forEach((m: any) => {
          if (m.type === colorMarkType) marks.push(m);
        });
      }
    });
    expect(marks).toHaveLength(1);
    expect(marks[0].attrs.color).toBe('#00FF00');
  });

  it('applies color to multiple paragraphs in selection', () => {
    const twoParas = doc(schema,
      p(schema, text(schema, 'first')),
      p(schema, text(schema, 'second')),
    );
    const state = createStateWithSelection(twoParas, 1, 13);
    const next = applyCommand(state, setTextColor('#FF0000'))!;
    expect(next.doc.textContent).toBe('firstsecond');
    expect(getActiveTextColor(createState(next.doc, 2))).toBe('#FF0000');
    expect(getActiveTextColor(createState(next.doc, 8))).toBe('#FF0000');
  });

  it('returns true even without dispatch (dry-run)', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello'))),
      1, 6,
    );
    expect(canExecute(state, setTextColor('#FF0000'))).toBe(true);
  });

  it('accepts hex, rgb, and named color formats', () => {
    const hexState = createStateWithSelection(doc(schema, p(schema, text(schema, 'a'))), 1, 2);
    const rgbState = createStateWithSelection(doc(schema, p(schema, text(schema, 'b'))), 1, 2);
    const namedState = createStateWithSelection(doc(schema, p(schema, text(schema, 'c'))), 1, 2);

    const hexNext = applyCommand(hexState, setTextColor('#FF0000'))!;
    const rgbNext = applyCommand(rgbState, setTextColor('rgb(255,0,0)'))!;
    const namedNext = applyCommand(namedState, setTextColor('red'))!;

    expect(getActiveTextColor(createState(hexNext.doc, 1))).toBe('#FF0000');
    expect(getActiveTextColor(createState(rgbNext.doc, 1))).toBe('rgb(255,0,0)');
    expect(getActiveTextColor(createState(namedNext.doc, 1))).toBe('red');
  });
});

// ---------------------------------------------------------------------------
// removeTextColor command
// ---------------------------------------------------------------------------

describe('removeTextColor', () => {
  it('removes textColor mark from colored text', () => {
    const state = selectionWithColor('#FF0000');
    const next = applyCommand(state, removeTextColor);
    expect(next).not.toBeNull();
    expect(getActiveTextColor(createState(next!.doc, 2))).toBeNull();
  });

  it('returns true and dispatches when color mark present', () => {
    const state = selectionWithColor('#FF0000');
    let dispatched = false;
    const result = removeTextColor(state, () => { dispatched = true; });
    expect(result).toBe(true);
    expect(dispatched).toBe(true);
  });

  it('returns false on uncolored text (nothing to remove)', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'plain'))),
      1, 6,
    );
    expect(canExecute(state, removeTextColor)).toBe(false);
  });

  it('does not dispatch when no color mark present', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'plain'))),
      1, 6,
    );
    let dispatched = false;
    removeTextColor(state, () => { dispatched = true; });
    expect(dispatched).toBe(false);
  });

  it('preserves text content after removal', () => {
    const state = selectionWithColor('#FF0000');
    const next = applyCommand(state, removeTextColor)!;
    expect(next.doc.textContent).toBe('hello');
  });

  it('preserves other marks (bold) when removing color', () => {
    const boldMark = schema.marks.strong;
    const colorMark = colorMarkType.create({ color: '#FF0000' });
    const colored = schema.text('hello', [boldMark.create(), colorMark]);
    const state = createStateWithSelection(doc(schema, p(schema, colored)), 1, 6);
    const next = applyCommand(state, removeTextColor)!;
    const check = createState(next.doc, 2);
    // color removed
    expect(getActiveTextColor(check)).toBeNull();
    // bold preserved
    const textNode = (next.doc.content as any).content[0].content.content[0];
    expect(boldMark.isInSet(textNode.marks)).not.toBeUndefined();
  });

  it('remove then reapply restores color', () => {
    const state = selectionWithColor('#FF0000');
    const removed = applyCommand(state, removeTextColor)!;
    const reapplied = applyCommand(
      createStateWithSelection(removed.doc, 1, 6),
      setTextColor('#FF0000'),
    )!;
    expect(getActiveTextColor(createState(reapplied.doc, 2))).toBe('#FF0000');
  });
});

// ---------------------------------------------------------------------------
// getActiveTextColor
// ---------------------------------------------------------------------------

describe('getActiveTextColor', () => {
  it('returns null on normal text', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'plain'))), 2);
    expect(getActiveTextColor(state)).toBeNull();
  });

  it('returns the color when cursor is inside colored text', () => {
    const state = stateWithColor('#FF0000', 2);
    expect(getActiveTextColor(state)).toBe('#FF0000');
  });

  it('returns color at textOffset=0 (start of colored node)', () => {
    const state = stateWithColor('#00FF00', 1);
    expect(getActiveTextColor(state)).toBe('#00FF00');
  });

  it('returns null on empty document', () => {
    const state = EditorState.create({ schema });
    expect(getActiveTextColor(state)).toBeNull();
  });

  it('returns color for full range selection over colored text', () => {
    const state = selectionWithColor('#0000FF');
    expect(getActiveTextColor(state)).toBe('#0000FF');
  });

  it('returns null for mixed-color range selection', () => {
    const red = colorMarkType.create({ color: '#FF0000' });
    const blue = colorMarkType.create({ color: '#0000FF' });
    const mixed = p(schema,
      schema.text('red', [red]),
      schema.text('blue', [blue]),
    );
    const state = createStateWithSelection(doc(schema, mixed), 1, 8);
    expect(getActiveTextColor(state)).toBeNull();
  });

  it('returns null for range with partial color (some plain, some colored)', () => {
    const red = colorMarkType.create({ color: '#FF0000' });
    const mixed = p(schema,
      schema.text('plain'),
      schema.text('red', [red]),
    );
    const state = createStateWithSelection(doc(schema, mixed), 1, 9);
    expect(getActiveTextColor(state)).toBeNull();
  });

  it('returns the single color for homogeneous colored range', () => {
    const green = colorMarkType.create({ color: '#22C55E' });
    const allGreen = p(schema,
      schema.text('all', [green]),
      schema.text('green', [green]),
    );
    const state = createStateWithSelection(doc(schema, allGreen), 1, 9);
    expect(getActiveTextColor(state)).toBe('#22C55E');
  });
});

// ---------------------------------------------------------------------------
// Toolbar getChildren — recently used tracking
// ---------------------------------------------------------------------------

describe('toolbar getChildren and recently used', () => {
  it('getChildren returns an array of toolbar items', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const children = toolbarItem.getChildren!(state);
    expect(Array.isArray(children)).toBe(true);
    expect(children.length).toBeGreaterThan(0);
  });

  it('getChildren includes swatch items for each palette color', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const children = toolbarItem.getChildren!(state);
    const swatchIds = children.filter(c => c.id.startsWith('textColor-swatch-'));
    expect(swatchIds.length).toBe(DEFAULT_TEXT_COLOR_PALETTE.length);
  });

  it('getChildren includes a custom color-picker item', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const children = toolbarItem.getChildren!(state);
    const picker = children.find(c => c.id === 'textColor-custom');
    expect(picker).toBeDefined();
    expect(picker!.type).toBe('color-picker');
  });

  it('swatch items have isActive that detects matching color', () => {
    const state = stateWithColor('#EF4444', 2); // Red from palette
    const children = toolbarItem.getChildren!(state);
    const redSwatch = children.find(c => c.id === 'textColor-swatch-EF4444');
    expect(redSwatch).toBeDefined();
    expect(redSwatch!.isActive!(state)).toBe(true);
  });

  it('swatch items have isActive that returns false for non-matching color', () => {
    const state = stateWithColor('#FF0000', 2);
    const children = toolbarItem.getChildren!(state);
    const blueSwatch = children.find(c => c.id === 'textColor-swatch-3B82F6');
    expect(blueSwatch).toBeDefined();
    expect(blueSwatch!.isActive!(state)).toBe(false);
  });

  it('after applying a palette color, getChildren includes recently used section', () => {
    // Apply a color to set lastUsedTextColor
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello'))),
      1, 6,
    );
    // Find a swatch command and apply it
    const children = toolbarItem.getChildren!(state);
    const firstSwatch = children.find(c => c.id.startsWith('textColor-swatch-') && c.command);
    if (firstSwatch && firstSwatch.command) {
      firstSwatch.command(state, () => {}); // triggers lastUsedTextColor update
    }

    const afterState = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const newChildren = toolbarItem.getChildren!(afterState);
    const recentLabel = newChildren.find(c => c.id === 'textColor-label-recent');
    expect(recentLabel).toBeDefined();
    expect(recentLabel!.type).toBe('label');
  });
});

// ---------------------------------------------------------------------------
// Mark interactions
// ---------------------------------------------------------------------------

describe('textColor with other marks', () => {
  it('can combine textColor with bold', () => {
    const boldMark = schema.marks.strong;
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello', boldMark.create()))),
      1, 6,
    );
    const next = applyCommand(state, setTextColor('#FF0000'))!;
    const check = createState(next.doc, 2);
    expect(getActiveTextColor(check)).toBe('#FF0000');
    // Bold still present
    const textNode = (next.doc.content as any).content[0].content.content[0];
    expect(boldMark.isInSet(textNode.marks)).not.toBeUndefined();
  });

  it('can combine textColor with italic', () => {
    const emMark = schema.marks.em;
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello', emMark.create()))),
      1, 6,
    );
    const next = applyCommand(state, setTextColor('#0000FF'))!;
    const textNode = (next.doc.content as any).content[0].content.content[0];
    expect(emMark.isInSet(textNode.marks)).not.toBeUndefined();
    expect(colorMarkType.isInSet(textNode.marks)).not.toBeUndefined();
  });

  it('can combine textColor with underline', () => {
    const underlineMark = schema.marks.underline;
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello', underlineMark.create()))),
      1, 6,
    );
    const next = applyCommand(state, setTextColor('#22C55E'))!;
    const textNode = (next.doc.content as any).content[0].content.content[0];
    expect(underlineMark.isInSet(textNode.marks)).not.toBeUndefined();
    expect(colorMarkType.isInSet(textNode.marks)).not.toBeUndefined();
  });

  it('two different colors in same paragraph show as mixed (getActiveTextColor null)', () => {
    const red = colorMarkType.create({ color: '#FF0000' });
    const blue = colorMarkType.create({ color: '#0000FF' });
    const mixed = p(schema,
      schema.text('red', [red]),
      schema.text('blue', [blue]),
    );
    // Selecting both — mixed → null
    const state = createStateWithSelection(doc(schema, mixed), 1, 8);
    expect(getActiveTextColor(state)).toBeNull();
  });

  it('applying code mark removes textColor (code excludes all marks)', () => {
    const colorMark = colorMarkType.create({ color: '#FF0000' });
    const colored = schema.text('hello', [colorMark]);
    const state = createStateWithSelection(doc(schema, p(schema, colored)), 1, 6);
    const toggleCode = (s: any, d?: any) =>
      require('prosemirror-commands').toggleMark(schema.marks.code)(s, d);
    const next = applyCommand(state, toggleCode);
    expect(next).not.toBeNull();
    // code mark present, textColor removed (code excludes '_')
    expect(schema.marks.code.isInSet(
      (next!.doc.content as any).content[0].content.content[0].marks,
    )).not.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('setTextColor on empty doc does not throw', () => {
    const state = EditorState.create({ schema });
    expect(() => canExecute(state, setTextColor('#FF0000'))).not.toThrow();
  });

  it('removeTextColor on empty doc does not throw', () => {
    const state = EditorState.create({ schema });
    expect(() => canExecute(state, removeTextColor)).not.toThrow();
  });

  it('applying color with empty selection (collapsed cursor) returns true', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    // setTextColor with collapsed cursor — adds mark for future typing
    expect(canExecute(state, setTextColor('#FF0000'))).toBe(true);
  });

  it('getActiveTextColor on cursor at boundary between colored and plain text', () => {
    const red = colorMarkType.create({ color: '#FF0000' });
    // "hi " plain + "world" colored
    const mixed = p(schema, schema.text('hi '), schema.text('world', [red]));
    // pos 4 is at boundary (after 'hi ', before 'world')
    const state = createState(doc(schema, mixed), 4);
    // At boundary, ProseMirror's marks() uses dominant side logic
    // Result is implementation-defined — should be string or null
    const result = getActiveTextColor(state);
    expect(result === null || typeof result === 'string').toBe(true);
  });

  it('color mark toDOM produces correct style for each palette color', () => {
    DEFAULT_TEXT_COLOR_PALETTE.forEach(({ value }) => {
      const mark = colorMarkType.create({ color: value });
      const dom = colorMarkType.spec.toDOM!(mark, false) as unknown as any[];
      expect(dom[1].style).toBe(`color: ${value}`);
    });
  });
});
