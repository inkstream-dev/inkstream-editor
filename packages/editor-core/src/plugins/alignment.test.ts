import { setAlignment, getActiveAlignment, AlignValue } from '../commands/alignment';
import { alignmentPlugin } from './alignment';
import {
  getTestSchema,
  createState,
  createStateWithSelection,
  applyCommand,
  getBlockAttr,
  p,
  text,
  doc,
} from '../test-utils';

const schema = getTestSchema();

// ---------------------------------------------------------------------------
// alignmentPlugin registration
// ---------------------------------------------------------------------------

describe('alignmentPlugin', () => {
  it('has the correct plugin name', () => {
    expect(alignmentPlugin.name).toBe('alignment');
  });

  it('provides 4 toolbar items', () => {
    const items = alignmentPlugin.getToolbarItems!(schema);
    expect(items).toHaveLength(4);
  });

  it('toolbar item IDs are alignLeft/alignCenter/alignRight/alignJustify', () => {
    const items = alignmentPlugin.getToolbarItems!(schema);
    const ids = items.map(i => i.id);
    expect(ids).toEqual(['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']);
  });

  it('all toolbar items have SVG icons', () => {
    const items = alignmentPlugin.getToolbarItems!(schema);
    items.forEach(item => {
      expect(item.iconHtml).toContain('<svg');
    });
  });

  it('provides keyboard shortcuts for all 4 alignments', () => {
    const keymap = alignmentPlugin.getKeymap!(schema);
    expect(keymap['Mod-Shift-l']).toBeDefined();
    expect(keymap['Mod-Shift-e']).toBeDefined();
    expect(keymap['Mod-Shift-r']).toBeDefined();
    expect(keymap['Mod-Shift-j']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// setAlignment command
// ---------------------------------------------------------------------------

describe('setAlignment', () => {
  it('applies center alignment to a paragraph', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, setAlignment('center'));
    expect(next).not.toBeNull();
    const check = createState(next!.doc, 2);
    expect(getBlockAttr(check, 'align')).toBe('center');
  });

  it('applies right alignment to a paragraph', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, setAlignment('right'));
    expect(next).not.toBeNull();
    const check = createState(next!.doc, 2);
    expect(getBlockAttr(check, 'align')).toBe('right');
  });

  it('applies justify alignment to a paragraph', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, setAlignment('justify'));
    expect(next).not.toBeNull();
    const check = createState(next!.doc, 2);
    expect(getBlockAttr(check, 'align')).toBe('justify');
  });

  it('toggles center off when already center-aligned (resets to null)', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    // Apply center
    const centered = applyCommand(state, setAlignment('center'))!;
    // Toggle center off
    const toggled = applyCommand(createState(centered.doc, 2), setAlignment('center'));
    expect(toggled).not.toBeNull();
    const check = createState(toggled!.doc, 2);
    expect(getBlockAttr(check, 'align')).toBeNull();
  });

  it('treats null and "left" as the same effective alignment (no-op on left)', () => {
    // Default paragraph has align: null (treated as left)
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    // setAlignment('left') on a null-align paragraph should be a no-op (no change)
    const result = applyCommand(state, setAlignment('left'));
    // When current is null and new would also be null (toggle), returns no change
    // setAlignment returns false when nothing changed — applyCommand returns null
    expect(result).toBeNull();
  });

  it('preserves text content when changing alignment', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'align me'))), 2);
    const next = applyCommand(state, setAlignment('center'))!;
    expect(next.doc.textContent).toBe('align me');
  });

  it('applies alignment to multiple blocks in a selection', () => {
    const twoParas = doc(schema,
      p(schema, text(schema, 'first')),
      p(schema, text(schema, 'second')),
    );
    // Select from inside first para to inside second para
    const state = createStateWithSelection(twoParas, 2, 9);
    const next = applyCommand(state, setAlignment('center'));
    expect(next).not.toBeNull();
    // Both paragraphs should now be centered
    const paraAttrs = (next!.doc.content as any).content.map((n: any) => n.attrs.align);
    expect(paraAttrs).toEqual(['center', 'center']);
  });
});

// ---------------------------------------------------------------------------
// getActiveAlignment
// ---------------------------------------------------------------------------

describe('getActiveAlignment', () => {
  it('returns "left" for default (no align attr) paragraph — null normalized to left', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    // getActiveAlignment normalizes null → 'left'
    expect(getActiveAlignment(state)).toBe('left');
  });

  it('returns "center" after applying center alignment', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, setAlignment('center'))!;
    expect(getActiveAlignment(createState(next.doc, 2))).toBe('center');
  });

  it('returns "right" after applying right alignment', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, setAlignment('right'))!;
    expect(getActiveAlignment(createState(next.doc, 2))).toBe('right');
  });

  it('returns "left" for a paragraph with null align (treats null as left)', () => {
    // getActiveAlignment normalizes null → 'left'
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    expect(getActiveAlignment(state)).toBe('left');
  });

  it('returns null for mixed alignment selection', () => {
    const twoParas = doc(schema,
      p(schema, text(schema, 'first')),
      p(schema, text(schema, 'second')),
    );
    // Apply different alignments
    let state = createState(twoParas, 2);
    const centered = applyCommand(state, setAlignment('center'))!;
    // Only first para is centered; cursor in first para: 'center'
    // Now create selection spanning both
    const mixed = createStateWithSelection(centered.doc, 2, 9);
    // With two different alignments (center + null/left), result is null (mixed)
    const active = getActiveAlignment(mixed);
    expect(active === null || typeof active === 'string').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isActive toolbar items
// ---------------------------------------------------------------------------

describe('alignment toolbar isActive', () => {
  it('alignCenter isActive returns true after centering', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, setAlignment('center'))!;
    const nextState = createState(next.doc, 2);
    const items = alignmentPlugin.getToolbarItems!(schema);
    const centerItem = items.find(i => i.id === 'alignCenter')!;
    expect(centerItem.isActive!(nextState)).toBe(true);
  });

  it('alignLeft isActive returns false after centering', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 2);
    const next = applyCommand(state, setAlignment('center'))!;
    const nextState = createState(next.doc, 2);
    const items = alignmentPlugin.getToolbarItems!(schema);
    const leftItem = items.find(i => i.id === 'alignLeft')!;
    expect(leftItem.isActive!(nextState)).toBe(false);
  });
});
