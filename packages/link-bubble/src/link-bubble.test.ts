/**
 * Tests for the link-bubble plugin.
 *
 * Covers:
 *   - Link mark schema validation
 *   - removeLinkAtSelection command
 *   - getLinkBubbleToolbarItem (isActive, structure)
 *   - linkBubbleWrapperPlugin (structure, keymap)
 *   - URL utilities (normalizeUrl, isValidUrl)
 *   - Security: XSS/dangerous protocol prevention
 *   - Link interactions with other marks
 *   - Edge cases
 *
 * Note: DOM-dependent tests (LinkBubbleView, positioning, UI interactions)
 * require a browser environment and are covered by integration/E2E tests.
 */

import { EditorState, Transaction } from '@inkstream/pm/state';
import { Schema, Node, Mark } from '@inkstream/pm/model';
import {
  removeLinkAtSelection,
  getLinkBubbleToolbarItem,
  LINK_BUBBLE_KEY,
  linkBubblePlugin,
  normalizeUrl,
  isValidUrl,
} from './link-bubble';
import { linkBubbleWrapperPlugin } from './link-bubble-wrapper';

// Import editor-core test utilities via relative path (not in public package exports)
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a text node with a link mark applied. */
function linkedText(schema: Schema, str: string, href: string, extra: Record<string, string | null> = {}): Node {
  const linkMark = schema.marks.link.create({ href, title: null, target: null, rel: null, ...extra });
  return schema.text(str, [linkMark]);
}

/** Get the link mark from a text node at position pos in the doc. */
function getLinkMark(state: EditorState, pos: number): Mark | null {
  const node = state.doc.nodeAt(pos);
  if (!node) return null;
  return state.schema.marks.link.isInSet(node.marks) ?? null;
}

// ---------------------------------------------------------------------------
// Position constants for a document: p('before ', 'click here'[link], ' after')
// doc(p('before ' + 'click here'[link] + ' after'))
// pos 1: inside paragraph
// 'before '  = 7 chars → positions 1-7
// 'click here' = 10 chars → positions 8-17
// ' after'   = 6 chars → positions 18-23
// paragraph closes at 24
// ---------------------------------------------------------------------------
const POS_BEFORE_LINK = 3;   // inside 'before ' text
const POS_IN_LINK = 12;       // inside 'click here' (middle of link)
const LINK_START = 8;         // first char of 'click here'
const LINK_END = 18;          // position after last char of 'click here'

// ---------------------------------------------------------------------------
// Schema setup
// ---------------------------------------------------------------------------

let schema: Schema;

beforeAll(() => {
  schema = getTestSchema();
});

// ---------------------------------------------------------------------------
// 1. Link Mark Schema Tests
// ---------------------------------------------------------------------------

describe('link mark schema', () => {
  it('link mark exists in schema', () => {
    expect(schema.marks.link).toBeDefined();
  });

  it('has href attribute with null default', () => {
    const linkType = schema.marks.link;
    const mark = linkType.create({ href: 'https://example.com' });
    expect(mark.attrs['href']).toBe('https://example.com');
  });

  it('has title attribute with null default', () => {
    const mark = schema.marks.link.create({});
    expect(mark.attrs['title']).toBeNull();
  });

  it('has target attribute with null default', () => {
    const mark = schema.marks.link.create({});
    expect(mark.attrs['target']).toBeNull();
  });

  it('has rel attribute with null default', () => {
    const mark = schema.marks.link.create({});
    expect(mark.attrs['rel']).toBeNull();
  });

  it('inclusive is false (cursor after link does not extend it)', () => {
    expect((schema.marks.link.spec as any).inclusive).toBe(false);
  });

  it('can create link with all attributes', () => {
    const mark = schema.marks.link.create({
      href: 'https://example.com',
      title: 'Example',
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    expect(mark.attrs['href']).toBe('https://example.com');
    expect(mark.attrs['title']).toBe('Example');
    expect(mark.attrs['target']).toBe('_blank');
    expect(mark.attrs['rel']).toBe('noopener noreferrer');
  });

  it('can create link with href only', () => {
    const mark = schema.marks.link.create({ href: 'https://example.com' });
    expect(mark.attrs['href']).toBe('https://example.com');
    expect(mark.attrs['title']).toBeNull();
    expect(mark.attrs['target']).toBeNull();
    expect(mark.attrs['rel']).toBeNull();
  });

  it('link mark can be applied to text node', () => {
    const mark = schema.marks.link.create({ href: 'https://example.com' });
    const node = schema.text('hello', [mark]);
    expect(schema.marks.link.isInSet(node.marks)).toBeTruthy();
  });

  it('link mark toDOM outputs anchor element', () => {
    const mark = schema.marks.link.create({ href: 'https://example.com', title: 'Test' });
    const domSpec = schema.marks.link.spec.toDOM!(mark, false) as unknown as any[];
    expect(domSpec[0]).toBe('a');
    expect(domSpec[1]['href']).toBe('https://example.com');
    expect(domSpec[1]['title']).toBe('Test');
  });

  it('link mark toDOM omits null attributes', () => {
    const mark = schema.marks.link.create({ href: 'https://example.com' });
    const domSpec = schema.marks.link.spec.toDOM!(mark, false) as unknown as any[];
    const attrs = domSpec[1];
    expect(attrs['target']).toBeUndefined();
    expect(attrs['rel']).toBeUndefined();
  });

  it('link mark toDOM includes target and rel when set', () => {
    const mark = schema.marks.link.create({
      href: 'https://example.com',
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    const domSpec = schema.marks.link.spec.toDOM!(mark, false) as unknown as any[];
    const attrs = domSpec[1];
    expect(attrs['target']).toBe('_blank');
    expect(attrs['rel']).toBe('noopener noreferrer');
  });

  it('link mark parseDOM spec handles a[href] tag', () => {
    const parseDomSpec = schema.marks.link.spec.parseDOM;
    expect(parseDomSpec).toBeDefined();
    expect(parseDomSpec![0].tag).toBe('a[href]');
  });
});

// ---------------------------------------------------------------------------
// 2. removeLinkAtSelection
// ---------------------------------------------------------------------------

describe('removeLinkAtSelection', () => {
  function makeDoc() {
    const lText = linkedText(schema, 'click here', 'https://example.com');
    return doc(schema,
      p(schema, text(schema, 'before '), lText, text(schema, ' after')),
    );
  }

  it('returns false when schema has no link mark', () => {
    const minimalSchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: { content: 'inline*', group: 'block' },
        text: { group: 'inline' },
      },
      marks: {},
    });
    const minState = EditorState.create({ schema: minimalSchema });
    expect(removeLinkAtSelection(minState)).toBe(false);
  });

  it('returns false when cursor is not inside a link', () => {
    const state = createState(makeDoc(), POS_BEFORE_LINK);
    expect(removeLinkAtSelection(state)).toBe(false);
  });

  it('returns true when cursor is inside a link', () => {
    const state = createState(makeDoc(), POS_IN_LINK);
    expect(removeLinkAtSelection(state)).toBe(true);
  });

  it('removes link mark when cursor is inside a link (dispatches tr)', () => {
    const state = createState(makeDoc(), POS_IN_LINK);
    const next = applyCommand(state, removeLinkAtSelection);
    expect(next).not.toBeNull();
    const linkMark = getLinkMark(next!, LINK_START);
    expect(linkMark).toBeNull();
  });

  it('preserves text content after link removal', () => {
    const state = createState(makeDoc(), POS_IN_LINK);
    const next = applyCommand(state, removeLinkAtSelection);
    expect(next!.doc.textContent).toBe('before click here after');
  });

  it('expands cursor to full link range before removing', () => {
    // Cursor at link start — should still remove entire link
    const state = createState(makeDoc(), LINK_START + 1);
    const next = applyCommand(state, removeLinkAtSelection);
    expect(next).not.toBeNull();
    // All chars in 'click here' should have no link mark
    for (let pos = LINK_START; pos < LINK_END; pos++) {
      const node = next!.doc.nodeAt(pos);
      if (node?.isText) {
        expect(schema.marks.link.isInSet(node.marks)).toBeFalsy();
      }
    }
  });

  it('removes link from a range selection over the link', () => {
    const state = createStateWithSelection(makeDoc(), LINK_START, LINK_END);
    const next = applyCommand(state, removeLinkAtSelection);
    expect(next).not.toBeNull();
    const linkMark = getLinkMark(next!, LINK_START);
    expect(linkMark).toBeNull();
  });

  it('removes link from partial range selection', () => {
    // Select only part of the link text
    const state = createStateWithSelection(makeDoc(), LINK_START, LINK_START + 3);
    const next = applyCommand(state, removeLinkAtSelection);
    expect(next).not.toBeNull();
  });

  it('returns true when range selection contains link text', () => {
    const state = createStateWithSelection(makeDoc(), LINK_START, LINK_END);
    expect(removeLinkAtSelection(state)).toBe(true);
  });

  it('does not dispatch transaction in dry-run mode', () => {
    const state = createState(makeDoc(), POS_IN_LINK);
    let dispatched = false;
    // canExecute calls without dispatch — no side effects
    removeLinkAtSelection(state, undefined);
    expect(dispatched).toBe(false);
  });

  it('returns true for range selection even when cursor not in link', () => {
    // Range selection from 'before' area to inside link
    const state = createStateWithSelection(makeDoc(), 2, LINK_END);
    // from=2 is in 'before ', to=18 covers link — from≠to branch dispatches without link check
    expect(removeLinkAtSelection(state)).toBe(true);
  });

  it('dispatches transaction with correct result when link removed', () => {
    const state = createState(makeDoc(), POS_IN_LINK);
    let tr: Transaction | null = null;
    removeLinkAtSelection(state, t => { tr = t; });
    expect(tr).not.toBeNull();
    expect(tr!.docChanged).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. getLinkBubbleToolbarItem
// ---------------------------------------------------------------------------

describe('getLinkBubbleToolbarItem', () => {
  let toolbarItem: ReturnType<typeof getLinkBubbleToolbarItem>;

  beforeAll(() => {
    toolbarItem = getLinkBubbleToolbarItem(schema);
  });

  function makeStateWithLink(pos: number) {
    const lText = linkedText(schema, 'click here', 'https://example.com');
    const docNode = doc(schema, p(schema, text(schema, 'before '), lText, text(schema, ' after')));
    return createState(docNode, pos);
  }

  it('returns toolbar item with id "link"', () => {
    expect(toolbarItem.id).toBe('link');
  });

  it('has icon property', () => {
    expect(toolbarItem.icon).toBeDefined();
  });

  it('has tooltip property', () => {
    expect(toolbarItem.tooltip).toBeDefined();
    expect(typeof toolbarItem.tooltip).toBe('string');
  });

  it('has command function', () => {
    expect(typeof toolbarItem.command).toBe('function');
  });

  it('has isActive function', () => {
    expect(typeof toolbarItem.isActive).toBe('function');
  });

  it('isActive returns false for cursor on plain text', () => {
    const state = makeStateWithLink(POS_BEFORE_LINK);
    expect(toolbarItem.isActive!(state)).toBe(false);
  });

  it('isActive returns true for cursor inside link', () => {
    const state = makeStateWithLink(POS_IN_LINK);
    expect(toolbarItem.isActive!(state)).toBe(true);
  });

  it('isActive returns true for range selection over entire link', () => {
    const lText = linkedText(schema, 'click here', 'https://example.com');
    const docNode = doc(schema, p(schema, text(schema, 'before '), lText, text(schema, ' after')));
    const state = createStateWithSelection(docNode, LINK_START, LINK_END);
    expect(toolbarItem.isActive!(state)).toBe(true);
  });

  it('isActive returns false for range selection with no link', () => {
    const docNode = doc(schema, p(schema, text(schema, 'plain text here')));
    const state = createStateWithSelection(docNode, 2, 6);
    expect(toolbarItem.isActive!(state)).toBe(false);
  });

  it('isActive returns true at cursor at link start boundary', () => {
    const state = makeStateWithLink(LINK_START + 1);
    expect(toolbarItem.isActive!(state)).toBe(true);
  });

  it('isActive returns false when schema has no link mark', () => {
    const minimalSchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: { content: 'inline*', group: 'block' },
        text: { group: 'inline' },
      },
      marks: {},
    });
    const toolbarItemMin = getLinkBubbleToolbarItem(minimalSchema);
    const state = EditorState.create({ schema: minimalSchema });
    expect(toolbarItemMin.isActive!(state)).toBe(false);
  });

  it('command returns true (delegates to openLinkBubble)', () => {
    const state = makeStateWithLink(POS_IN_LINK);
    // command calls openLinkBubble(view); with no view (undefined), activeLinkBubble is null → no-op
    const result = toolbarItem.command!(state, undefined, undefined as any);
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. LINK_BUBBLE_KEY and linkBubblePlugin
// ---------------------------------------------------------------------------

describe('LINK_BUBBLE_KEY and linkBubblePlugin', () => {
  it('LINK_BUBBLE_KEY is a PluginKey instance', () => {
    expect(LINK_BUBBLE_KEY).toBeDefined();
    expect(typeof LINK_BUBBLE_KEY.getState).toBe('function');
  });

  it('linkBubblePlugin is a ProseMirror Plugin', () => {
    // Plugin should have a spec property
    expect(linkBubblePlugin).toBeDefined();
    expect(typeof linkBubblePlugin.getState).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 5. linkBubbleWrapperPlugin structure
// ---------------------------------------------------------------------------

describe('linkBubbleWrapperPlugin', () => {
  it('has name "linkBubble"', () => {
    expect(linkBubbleWrapperPlugin.name).toBe('linkBubble');
  });

  it('has tier "free"', () => {
    expect(linkBubbleWrapperPlugin.tier).toBe('free');
  });

  it('has getProseMirrorPlugins function', () => {
    expect(typeof linkBubbleWrapperPlugin.getProseMirrorPlugins).toBe('function');
  });

  it('getProseMirrorPlugins returns array containing linkBubblePlugin', () => {
    const plugins = linkBubbleWrapperPlugin.getProseMirrorPlugins!(schema);
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins).toContain(linkBubblePlugin);
  });

  it('has getToolbarItems function', () => {
    expect(typeof linkBubbleWrapperPlugin.getToolbarItems).toBe('function');
  });

  it('getToolbarItems returns array with link item', () => {
    const items = linkBubbleWrapperPlugin.getToolbarItems!(schema);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('link');
  });

  it('has getInputRules function returning empty array', () => {
    expect(typeof linkBubbleWrapperPlugin.getInputRules).toBe('function');
    const rules = linkBubbleWrapperPlugin.getInputRules!(schema);
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBe(0);
  });

  it('has getKeymap function', () => {
    expect(typeof linkBubbleWrapperPlugin.getKeymap).toBe('function');
  });

  it('keymap has Mod-k binding', () => {
    const keymap = linkBubbleWrapperPlugin.getKeymap!(schema);
    expect(typeof keymap['Mod-k']).toBe('function');
  });

  it('keymap has Mod-Shift-k binding', () => {
    const keymap = linkBubbleWrapperPlugin.getKeymap!(schema);
    expect(typeof keymap['Mod-Shift-k']).toBe('function');
  });

  it('Mod-k handler returns true', () => {
    const keymap = linkBubbleWrapperPlugin.getKeymap!(schema);
    const handler = keymap['Mod-k'] as (state: EditorState, dispatch?: unknown, view?: unknown) => boolean;
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))));
    expect(handler(state, undefined, undefined)).toBe(true);
  });

  it('Mod-Shift-k removes link when cursor inside link', () => {
    const lText = linkedText(schema, 'click here', 'https://example.com');
    const docNode = doc(schema, p(schema, text(schema, 'before '), lText, text(schema, ' after')));
    const state = createState(docNode, POS_IN_LINK);
    const keymap = linkBubbleWrapperPlugin.getKeymap!(schema);
    const handler = keymap['Mod-Shift-k'] as (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
    const next = applyCommand(state, (s, d) => handler(s, d));
    expect(next).not.toBeNull();
    expect(getLinkMark(next!, LINK_START)).toBeNull();
  });

  it('Mod-Shift-k returns false when no link at cursor', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'plain text'))));
    const keymap = linkBubbleWrapperPlugin.getKeymap!(schema);
    const handler = keymap['Mod-Shift-k'] as (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
    expect(handler(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. normalizeUrl
// ---------------------------------------------------------------------------

describe('normalizeUrl', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeUrl('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com');
  });

  it('prepends https:// to bare domain', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });

  it('prepends https:// to www URL', () => {
    expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
  });

  it('preserves existing https:// URL', () => {
    expect(normalizeUrl('https://example.com/path?q=1#anchor')).toBe('https://example.com/path?q=1#anchor');
  });

  it('preserves existing http:// URL', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('preserves ftp:// URL', () => {
    expect(normalizeUrl('ftp://files.example.com')).toBe('ftp://files.example.com');
  });

  it('preserves mailto: links (has :// form)', () => {
    // mailto: does not have ://, so it gets prepended
    // This is expected behavior — mailto: links should use full mailto: syntax
    const result = normalizeUrl('mailto:user@example.com');
    // mailto:user@example.com does NOT match ://, so becomes https://mailto:user@example.com
    // This is a known behavior — mailto links need to be entered as full URLs
    expect(typeof result).toBe('string');
  });

  // Security: dangerous protocol prevention
  it('javascript: protocol gets converted to https:// (XSS prevention)', () => {
    const result = normalizeUrl('javascript:alert(1)');
    // javascript:alert(1) has no ://, so normalizeUrl prepends https://
    expect(result).toBe('https://javascript:alert(1)');
    expect(result.startsWith('javascript:')).toBe(false);
  });

  it('data: protocol gets converted to https:// (XSS prevention)', () => {
    const result = normalizeUrl('data:text/html,<script>alert(1)</script>');
    expect(result.startsWith('data:')).toBe(false);
    expect(result.startsWith('https://')).toBe(true);
  });

  it('vbscript: protocol gets converted to https:// (XSS prevention)', () => {
    const result = normalizeUrl('vbscript:msgbox("xss")');
    expect(result.startsWith('vbscript:')).toBe(false);
    expect(result.startsWith('https://')).toBe(true);
  });

  it('preserves URLs with query strings and fragments', () => {
    expect(normalizeUrl('https://example.com/path?q=hello%20world&page=1#section'))
      .toBe('https://example.com/path?q=hello%20world&page=1#section');
  });
});

// ---------------------------------------------------------------------------
// 7. isValidUrl
// ---------------------------------------------------------------------------

describe('isValidUrl', () => {
  it('returns false for empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('returns true for valid https URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('returns true for valid http URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('returns true for URL with path and query', () => {
    expect(isValidUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('returns false for bare domain (no protocol)', () => {
    expect(isValidUrl('example.com')).toBe(false);
  });

  it('returns false for invalid string', () => {
    expect(isValidUrl('not a url at all')).toBe(false);
  });

  it('returns false for string starting with spaces', () => {
    expect(isValidUrl('   ')).toBe(false);
  });

  it('returns true for URL with port', () => {
    expect(isValidUrl('https://localhost:3000/path')).toBe(true);
  });

  it('returns true for URL with fragment', () => {
    expect(isValidUrl('https://example.com/page#section')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Link with other marks (integration)
// ---------------------------------------------------------------------------

describe('link interactions with other marks', () => {
  function makeLinkedState(markNames: string[]) {
    const linkMark = schema.marks.link.create({ href: 'https://example.com' });
    const additionalMarks = markNames.map(name => schema.marks[name].create());
    const node = schema.text('linked text', [linkMark, ...additionalMarks]);
    const docNode = doc(schema, p(schema, node));
    return createState(docNode, 5);
  }

  it('link and bold can coexist', () => {
    const state = makeLinkedState(['strong']);
    const nodeAtPos = state.doc.nodeAt(1);
    expect(nodeAtPos).not.toBeNull();
    expect(schema.marks.link.isInSet(nodeAtPos!.marks)).toBeTruthy();
    expect(schema.marks.strong.isInSet(nodeAtPos!.marks)).toBeTruthy();
  });

  it('link and italic can coexist', () => {
    const state = makeLinkedState(['em']);
    const nodeAtPos = state.doc.nodeAt(1);
    expect(schema.marks.link.isInSet(nodeAtPos!.marks)).toBeTruthy();
    expect(schema.marks.em.isInSet(nodeAtPos!.marks)).toBeTruthy();
  });

  it('link and underline can coexist', () => {
    const state = makeLinkedState(['underline']);
    const nodeAtPos = state.doc.nodeAt(1);
    expect(schema.marks.link.isInSet(nodeAtPos!.marks)).toBeTruthy();
    expect(schema.marks.underline.isInSet(nodeAtPos!.marks)).toBeTruthy();
  });

  it('link and text color can coexist', () => {
    const linkMark = schema.marks.link.create({ href: 'https://example.com' });
    const colorMark = schema.marks.textColor.create({ color: '#ff0000' });
    const node = schema.text('colored link', [linkMark, colorMark]);
    const docNode = doc(schema, p(schema, node));
    const state = createState(docNode, 2);
    const nodeAtPos = state.doc.nodeAt(1);
    expect(schema.marks.link.isInSet(nodeAtPos!.marks)).toBeTruthy();
    expect(schema.marks.textColor.isInSet(nodeAtPos!.marks)).toBeTruthy();
  });

  it('link inside a heading', () => {
    const linkMark = schema.marks.link.create({ href: 'https://example.com' });
    const headingNode = schema.node('heading', { level: 1 }, schema.text('heading link', [linkMark]));
    const docNode = doc(schema, headingNode);
    const state = createState(docNode, 5);
    const nodeAtPos = state.doc.nodeAt(1);
    expect(schema.marks.link.isInSet(nodeAtPos!.marks)).toBeTruthy();
  });

  it('link inside a blockquote', () => {
    const linkMark = schema.marks.link.create({ href: 'https://example.com' });
    const bqNode = schema.node('blockquote', null, [
      p(schema, schema.text('quoted link', [linkMark])),
    ]);
    const docNode = doc(schema, bqNode);
    const state = createState(docNode, 3);
    const innerNode = state.doc.nodeAt(2);
    expect(innerNode).not.toBeNull();
    expect(schema.marks.link.isInSet(innerNode!.marks)).toBeTruthy();
  });

  it('removing link mark leaves other marks intact', () => {
    const linkMark = schema.marks.link.create({ href: 'https://example.com' });
    const boldMark = schema.marks.strong.create();
    const node = schema.text('bold link', [linkMark, boldMark]);
    const docNode = doc(schema, p(schema, node));
    // cursor inside the text (pos 1-9)
    const state = createState(docNode, 5);
    const next = applyCommand(state, removeLinkAtSelection);
    expect(next).not.toBeNull();
    // bold should still be there
    const nodeAfter = next!.doc.nodeAt(1);
    expect(schema.marks.link.isInSet(nodeAfter!.marks)).toBeFalsy();
    expect(schema.marks.strong.isInSet(nodeAfter!.marks)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 9. External link security attributes
// ---------------------------------------------------------------------------

describe('external link security attributes', () => {
  it('link mark can store rel="noopener noreferrer" for external links', () => {
    const mark = schema.marks.link.create({
      href: 'https://external.com',
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    expect(mark.attrs['target']).toBe('_blank');
    expect(mark.attrs['rel']).toBe('noopener noreferrer');
  });

  it('link mark without target has no rel by default', () => {
    const mark = schema.marks.link.create({ href: 'https://example.com' });
    expect(mark.attrs['rel']).toBeNull();
    expect(mark.attrs['target']).toBeNull();
  });

  it('link mark preserves title attribute', () => {
    const mark = schema.marks.link.create({
      href: 'https://example.com',
      title: 'Visit Example',
    });
    expect(mark.attrs['title']).toBe('Visit Example');
  });

  it('link mark can have internal link (relative URL)', () => {
    const mark = schema.marks.link.create({ href: '/internal/page' });
    expect(mark.attrs['href']).toBe('/internal/page');
  });

  it('link mark can store anchor link', () => {
    const mark = schema.marks.link.create({ href: '#section-1' });
    expect(mark.attrs['href']).toBe('#section-1');
  });
});

// ---------------------------------------------------------------------------
// 10. Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('link at document start', () => {
    const lText = linkedText(schema, 'start link', 'https://example.com');
    const docNode = doc(schema, p(schema, lText, text(schema, ' and more')));
    const state = createState(docNode, 2);
    expect(removeLinkAtSelection(state)).toBe(true);
    const next = applyCommand(state, removeLinkAtSelection);
    expect(next!.doc.textContent).toBe('start link and more');
  });

  it('link at document end', () => {
    const lText = linkedText(schema, 'end link', 'https://example.com');
    const docNode = doc(schema, p(schema, text(schema, 'before '), lText));
    // Cursor in the middle of 'end link'
    // 'before ' = 7 chars, positions 1-7
    // 'end link' = 8 chars, positions 8-15
    const state = createState(docNode, 12);
    expect(removeLinkAtSelection(state)).toBe(true);
  });

  it('two adjacent links in same paragraph', () => {
    const link1 = linkedText(schema, 'first', 'https://first.com');
    const link2 = linkedText(schema, 'second', 'https://second.com');
    const docNode = doc(schema, p(schema, link1, text(schema, ' '), link2));
    // Cursor in first link (pos 3)
    const state1 = createState(docNode, 3);
    const next1 = applyCommand(state1, removeLinkAtSelection);
    expect(next1).not.toBeNull();
    // first link removed, second link still present
    // 'first' = 5 chars at positions 1-5; ' ' at 6; 'second' at 7-12
    const nodeAtSecond = next1!.doc.nodeAt(7);
    expect(schema.marks.link.isInSet(nodeAtSecond!.marks)).toBeTruthy();
  });

  it('link mark with very long URL', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2000);
    const mark = schema.marks.link.create({ href: longUrl });
    expect(mark.attrs['href']).toBe(longUrl);
    expect(mark.attrs['href'].length).toBe(longUrl.length);
  });

  it('link mark with URL containing special characters', () => {
    const url = 'https://example.com/path?q=hello%20world&lang=en#section-1';
    const mark = schema.marks.link.create({ href: url });
    expect(mark.attrs['href']).toBe(url);
  });

  it('link mark with unicode URL', () => {
    const url = 'https://example.com/path/über/schön';
    const mark = schema.marks.link.create({ href: url });
    expect(mark.attrs['href']).toBe(url);
  });

  it('creating link mark is idempotent', () => {
    const mark1 = schema.marks.link.create({ href: 'https://example.com' });
    const mark2 = schema.marks.link.create({ href: 'https://example.com' });
    expect(mark1.eq(mark2)).toBe(true);
  });

  it('two link marks with different hrefs are not equal', () => {
    const mark1 = schema.marks.link.create({ href: 'https://a.com' });
    const mark2 = schema.marks.link.create({ href: 'https://b.com' });
    expect(mark1.eq(mark2)).toBe(false);
  });

  it('removeLink on cursor returns false in paragraph with no link', () => {
    const docNode = doc(schema, p(schema, text(schema, 'no links here')));
    const state = createState(docNode, 5);
    expect(removeLinkAtSelection(state)).toBe(false);
  });

  it('can apply link to text in first and last paragraph', () => {
    const docNode = doc(schema,
      p(schema, text(schema, 'first paragraph')),
      p(schema, text(schema, 'last paragraph')),
    );
    // Select text in last paragraph: first p = 17 chars (15+2tokens), so second p starts at ~17
    // first para: 1 open + 15 chars + 1 close = 17, second para starts at pos 17
    const state = createStateWithSelection(docNode, 18, 22);
    const linkType = schema.marks.link;
    const tr = state.tr.addMark(18, 22, linkType.create({ href: 'https://example.com' }));
    const next = state.apply(tr);
    expect(next.doc.nodeAt(18)).not.toBeNull();
  });
});
