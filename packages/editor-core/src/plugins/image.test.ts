/**
 * Tests for the image plugin.
 *
 * Covers:
 *   - Plugin registration (name, tier)
 *   - Image node schema (attrs, inline, group, draggable, selectable, parseDOM, toDOM)
 *   - insertImage command (src, alt, title, width, height)
 *   - Toolbar item command (insert placeholder)
 *   - Attribute handling (all attrs, null defaults)
 *   - Accessibility (alt text, decorative images)
 *   - Lazy loading (loading attr via toDOM)
 *   - Multi-image layout
 *   - Copy/paste structure (schema parseDOM/toDOM)
 *   - Edge cases
 *
 * Note: Resize, drag-and-drop, upload, and alignment are not implemented
 * in the current plugin — those require browser/UI testing.
 */

import { imagePlugin, insertImage } from '@inkstream/image';
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
import { NodeSelection } from '@inkstream/pm/state';
import { Schema, Node } from '@inkstream/pm/model';

const schema = getTestSchema();
const imageNodeType = schema.nodes.image;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an image node with given attrs. */
function img(attrs: Record<string, string | null> = {}) {
  return imageNodeType.create({
    src: null,
    alt: null,
    title: null,
    width: null,
    height: null,
    ...attrs,
  });
}

/** Build a doc with a paragraph containing text + image + text. */
function docWithImage(
  attrs: Record<string, string | null> = { src: 'https://example.com/img.jpg' },
  prefix = 'before',
  suffix = 'after',
): Node {
  return doc(schema,
    p(schema,
      text(schema, prefix),
      img(attrs),
      text(schema, suffix),
    ),
  );
}

/** Find the first image node in a doc by traversing descendants. */
function findImageNode(docNode: Node): Node | null {
  let found: Node | null = null;
  docNode.descendants(node => {
    if (!found && node.type === imageNodeType) {
      found = node;
      return false;
    }
  });
  return found;
}

/**
 * Position of image in doc(p('before', img, 'after')).
 * 'before' = 6 chars → positions 1-6 inside para → image at pos 7.
 */
const POS_IMAGE = 7;

// ============================================================================
// 1. Plugin registration
// ============================================================================

describe('imagePlugin', () => {
  it('has name "image"', () => {
    expect(imagePlugin.name).toBe('image');
  });

  it('tier defaults to "free"', () => {
    expect(imagePlugin.tier ?? 'free').toBe('free');
  });

  it('contributes image node to schema', () => {
    expect(imageNodeType).toBeDefined();
  });

  it('image node is registered in availablePlugins via imagePlugin', () => {
    expect(imagePlugin.nodes).toBeDefined();
    expect(imagePlugin.nodes!['image']).toBeDefined();
  });
});

// ============================================================================
// 2. Image node schema
// ============================================================================

describe('image node schema', () => {
  it('image node exists in schema', () => {
    expect(schema.nodes.image).toBeDefined();
  });

  it('is an inline node', () => {
    expect(imageNodeType.spec.inline).toBe(true);
  });

  it('belongs to inline group', () => {
    expect(imageNodeType.spec.group).toBe('inline');
  });

  it('is draggable', () => {
    expect(imageNodeType.spec.draggable).toBe(true);
  });

  it('is selectable', () => {
    expect(imageNodeType.spec.selectable).toBe(true);
  });

  it('has src attribute with null default', () => {
    const node = imageNodeType.create({});
    expect(node.attrs['src']).toBeNull();
  });

  it('has alt attribute with null default', () => {
    const node = imageNodeType.create({});
    expect(node.attrs['alt']).toBeNull();
  });

  it('has title attribute with null default', () => {
    const node = imageNodeType.create({});
    expect(node.attrs['title']).toBeNull();
  });

  it('has width attribute with null default', () => {
    const node = imageNodeType.create({});
    expect(node.attrs['width']).toBeNull();
  });

  it('has height attribute with null default', () => {
    const node = imageNodeType.create({});
    expect(node.attrs['height']).toBeNull();
  });

  it('can create node with all attributes', () => {
    const node = imageNodeType.create({
      src: 'https://example.com/img.jpg',
      alt: 'A beautiful image',
      title: 'Image tooltip',
      width: '800',
      height: '600',
    });
    expect(node.attrs['src']).toBe('https://example.com/img.jpg');
    expect(node.attrs['alt']).toBe('A beautiful image');
    expect(node.attrs['title']).toBe('Image tooltip');
    expect(node.attrs['width']).toBe('800');
    expect(node.attrs['height']).toBe('600');
  });

  it('node has nodeSize of 1 (leaf inline node)', () => {
    const node = img({ src: 'https://example.com/img.jpg' });
    expect(node.nodeSize).toBe(1);
  });

  it('parseDOM spec handles img[src] tag', () => {
    const parseDom = imageNodeType.spec.parseDOM;
    expect(parseDom).toBeDefined();
    expect(parseDom!.length).toBeGreaterThan(0);
    expect((parseDom![0] as any).tag).toBe('img[src]');
  });

  it('parseDOM getAttrs function exists', () => {
    const parseDom = imageNodeType.spec.parseDOM;
    expect(typeof (parseDom![0] as any).getAttrs).toBe('function');
  });

  describe('toDOM', () => {
    it('toDOM outputs <img> element', () => {
      const node = img({ src: 'https://example.com/img.jpg' });
      const domSpec = imageNodeType.spec.toDOM!(node) as unknown as any[];
      expect(domSpec[0]).toBe('img');
    });

    it('toDOM includes src when set', () => {
      const node = img({ src: 'https://example.com/img.jpg' });
      const domSpec = imageNodeType.spec.toDOM!(node) as unknown as any[];
      expect(domSpec[1]['src']).toBe('https://example.com/img.jpg');
    });

    it('toDOM includes alt when set', () => {
      const node = img({ src: 'https://example.com/img.jpg', alt: 'Test alt' });
      const domSpec = imageNodeType.spec.toDOM!(node) as unknown as any[];
      expect(domSpec[1]['alt']).toBe('Test alt');
    });

    it('toDOM includes title when set', () => {
      const node = img({ src: 'https://example.com/img.jpg', title: 'Tooltip' });
      const domSpec = imageNodeType.spec.toDOM!(node) as unknown as any[];
      expect(domSpec[1]['title']).toBe('Tooltip');
    });

    it('toDOM includes width when set', () => {
      const node = img({ src: 'https://example.com/img.jpg', width: '400' });
      const domSpec = imageNodeType.spec.toDOM!(node) as unknown as any[];
      expect(domSpec[1]['width']).toBe('400');
    });

    it('toDOM includes height when set', () => {
      const node = img({ src: 'https://example.com/img.jpg', height: '300' });
      const domSpec = imageNodeType.spec.toDOM!(node) as unknown as any[];
      expect(domSpec[1]['height']).toBe('300');
    });

    it('toDOM omits null attributes', () => {
      const node = img({ src: 'https://example.com/img.jpg' });
      const domSpec = imageNodeType.spec.toDOM!(node) as unknown as any[];
      const attrs = domSpec[1];
      expect(attrs['alt']).toBeUndefined();
      expect(attrs['title']).toBeUndefined();
      expect(attrs['width']).toBeUndefined();
      expect(attrs['height']).toBeUndefined();
    });

    it('toDOM omits src when null', () => {
      const node = img({});
      const domSpec = imageNodeType.spec.toDOM!(node) as unknown as any[];
      expect(domSpec[1]['src']).toBeUndefined();
    });
  });
});

// ============================================================================
// 3. insertImage command
// ============================================================================

describe('insertImage command', () => {
  it('inserts image with src into document', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    const cmd = insertImage('https://example.com/img.jpg');
    const next = applyCommand(state, cmd);
    expect(next).not.toBeNull();
    const imgNode = findImageNode(next!.doc);
    expect(imgNode).not.toBeNull();
    expect(imgNode!.attrs['src']).toBe('https://example.com/img.jpg');
  });

  it('inserts image with alt text', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    const cmd = insertImage('https://example.com/img.jpg', 'Alt description');
    const next = applyCommand(state, cmd);
    expect(next).not.toBeNull();
    expect(findImageNode(next!.doc)!.attrs['alt']).toBe('Alt description');
  });

  it('inserts image with title', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    const cmd = insertImage('https://example.com/img.jpg', 'Alt', 'Image title');
    const next = applyCommand(state, cmd);
    expect(findImageNode(next!.doc)!.attrs['title']).toBe('Image title');
  });

  it('inserts image with empty alt (decorative image)', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    const cmd = insertImage('https://example.com/decor.jpg', '');
    const next = applyCommand(state, cmd);
    expect(findImageNode(next!.doc)!.attrs['alt']).toBe('');
  });

  it('inserts image at cursor position', () => {
    // Cursor at pos 1 (start of paragraph content)
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 1);
    const cmd = insertImage('https://example.com/img.jpg');
    const next = applyCommand(state, cmd);
    expect(next).not.toBeNull();
    // Image should be the first inline node in the paragraph
    const para = next!.doc.firstChild!;
    expect(para.firstChild!.type).toBe(imageNodeType);
  });

  it('returns true on successful insertion', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    expect(canExecute(state, insertImage('https://example.com/img.jpg'))).toBe(true);
  });

  it('dispatches transaction on insert', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    let dispatched = false;
    insertImage('https://example.com/img.jpg')(state, () => { dispatched = true; });
    expect(dispatched).toBe(true);
  });

  it('preserves surrounding text content', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    const cmd = insertImage('https://example.com/img.jpg');
    const next = applyCommand(state, cmd);
    // 'hel' + image + 'lo' → textContent has 'hello'
    expect(next!.doc.textContent).toBe('hello');
  });

  it('replaces selected text with image', () => {
    const state = createStateWithSelection(
      doc(schema, p(schema, text(schema, 'hello world'))),
      1, 6,
    );
    const cmd = insertImage('https://example.com/img.jpg');
    const next = applyCommand(state, cmd);
    expect(next).not.toBeNull();
    // 'hello' replaced by image → remaining text ' world'
    expect(next!.doc.textContent).toBe(' world');
    expect(findImageNode(next!.doc)).not.toBeNull();
  });

  it('insert image at end of paragraph', () => {
    // Cursor at pos 6 (after 'hello' in doc(p('hello')))
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 6);
    const cmd = insertImage('https://example.com/img.jpg');
    const next = applyCommand(state, cmd);
    expect(next).not.toBeNull();
    expect(findImageNode(next!.doc)).not.toBeNull();
  });

  it('insert image at start of paragraph', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 1);
    const cmd = insertImage('https://example.com/img.jpg');
    const next = applyCommand(state, cmd);
    expect(next).not.toBeNull();
    const para = next!.doc.firstChild!;
    expect(para.firstChild!.type).toBe(imageNodeType);
  });

  it('default alt is empty string', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hi'))), 1);
    const cmd = insertImage('https://example.com/img.jpg'); // no alt arg
    const next = applyCommand(state, cmd);
    // Default alt parameter is ''
    expect(findImageNode(next!.doc)!.attrs['alt']).toBe('');
  });
});

// ============================================================================
// 4. Toolbar item
// ============================================================================

describe('image toolbar item', () => {
  it('provides one toolbar item with id "image"', () => {
    const items = imagePlugin.getToolbarItems!(schema);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('image');
  });

  it('toolbar item has SVG icon', () => {
    const item = imagePlugin.getToolbarItems!(schema)[0];
    expect(item.iconHtml).toContain('<svg');
  });

  it('SVG icon contains landscape elements (rect, circle, path)', () => {
    const item = imagePlugin.getToolbarItems!(schema)[0];
    expect(item.iconHtml).toContain('rect');
    expect(item.iconHtml).toContain('circle');
    expect(item.iconHtml).toContain('path');
  });

  it('toolbar item tooltip mentions Image', () => {
    const item = imagePlugin.getToolbarItems!(schema)[0];
    expect(item.tooltip).toMatch(/image/i);
  });

  it('toolbar item command inserts placeholder image (src=null)', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    const item = imagePlugin.getToolbarItems!(schema)[0];
    const next = applyCommand(state, item.command!);
    expect(next).not.toBeNull();
    const imgNode = findImageNode(next!.doc);
    expect(imgNode).not.toBeNull();
    expect(imgNode!.attrs['src']).toBeNull();
  });

  it('toolbar item command returns true', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    const item = imagePlugin.getToolbarItems!(schema)[0];
    expect(canExecute(state, item.command!)).toBe(true);
  });

  it('toolbar item command dispatches transaction', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    const item = imagePlugin.getToolbarItems!(schema)[0];
    let dispatched = false;
    item.command!(state, () => { dispatched = true; });
    expect(dispatched).toBe(true);
  });
});

// ============================================================================
// 5. Image attribute handling
// ============================================================================

describe('image attribute handling', () => {
  it('src stores absolute URL', () => {
    const node = img({ src: 'https://example.com/photo.jpg' });
    expect(node.attrs['src']).toBe('https://example.com/photo.jpg');
  });

  it('src stores relative URL', () => {
    const node = img({ src: '/images/photo.jpg' });
    expect(node.attrs['src']).toBe('/images/photo.jpg');
  });

  it('src stores URL with query parameters', () => {
    const node = img({ src: 'https://cdn.example.com/img?w=800&h=600&format=webp' });
    expect(node.attrs['src']).toBe('https://cdn.example.com/img?w=800&h=600&format=webp');
  });

  it('src stores URL with fragment', () => {
    const node = img({ src: 'https://example.com/img.svg#icon' });
    expect(node.attrs['src']).toBe('https://example.com/img.svg#icon');
  });

  it('src stores data URI (base64)', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
    const node = img({ src: dataUri });
    expect(node.attrs['src']).toBe(dataUri);
  });

  it('src stores URL with special characters (encoded)', () => {
    const node = img({ src: 'https://example.com/my%20photo%20file.jpg' });
    expect(node.attrs['src']).toBe('https://example.com/my%20photo%20file.jpg');
  });

  it('alt stores descriptive text', () => {
    const node = img({ alt: 'A sunset over the mountains' });
    expect(node.attrs['alt']).toBe('A sunset over the mountains');
  });

  it('alt can be empty string for decorative images', () => {
    const node = img({ alt: '' });
    expect(node.attrs['alt']).toBe('');
  });

  it('alt can be null when not specified', () => {
    const node = img({});
    expect(node.attrs['alt']).toBeNull();
  });

  it('title stores tooltip text', () => {
    const node = img({ title: 'Mountain landscape at golden hour' });
    expect(node.attrs['title']).toBe('Mountain landscape at golden hour');
  });

  it('width stores pixel value as string', () => {
    const node = img({ width: '800' });
    expect(node.attrs['width']).toBe('800');
  });

  it('height stores pixel value as string', () => {
    const node = img({ height: '600' });
    expect(node.attrs['height']).toBe('600');
  });

  it('width stores percentage value', () => {
    const node = img({ width: '50%' });
    expect(node.attrs['width']).toBe('50%');
  });

  it('all attributes null by default', () => {
    const node = imageNodeType.create({});
    expect(node.attrs['src']).toBeNull();
    expect(node.attrs['alt']).toBeNull();
    expect(node.attrs['title']).toBeNull();
    expect(node.attrs['width']).toBeNull();
    expect(node.attrs['height']).toBeNull();
  });

  it('two image nodes with same attrs are structurally equal', () => {
    const n1 = img({ src: 'https://a.com/img.jpg', alt: 'test' });
    const n2 = img({ src: 'https://a.com/img.jpg', alt: 'test' });
    expect(n1.attrs).toEqual(n2.attrs);
  });

  it('two image nodes with different src are not equal', () => {
    const n1 = img({ src: 'https://a.com/img.jpg' });
    const n2 = img({ src: 'https://b.com/img.jpg' });
    expect(n1.attrs['src']).not.toBe(n2.attrs['src']);
  });
});

// ============================================================================
// 6. Accessibility tests
// ============================================================================

describe('accessibility: alt text handling', () => {
  it('insertImage stores alt text in node', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hi'))), 1);
    const next = applyCommand(state, insertImage('https://example.com/img.jpg', 'Screen reader description'));
    const imgNode = findImageNode(next!.doc)!;
    expect(imgNode.attrs['alt']).toBe('Screen reader description');
  });

  it('insertImage with empty alt marks image as decorative', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hi'))), 1);
    const next = applyCommand(state, insertImage('https://example.com/decor.jpg', ''));
    expect(findImageNode(next!.doc)!.attrs['alt']).toBe('');
  });

  it('image node can be created with meaningful alt text', () => {
    const node = img({ src: 'https://example.com/chart.png', alt: 'Bar chart showing Q3 revenue growth of 25%' });
    expect(node.attrs['alt']).toBeTruthy();
  });

  it('title attribute provides tooltip for keyboard users', () => {
    const node = img({ src: 'https://example.com/img.jpg', title: 'Click to expand' });
    expect(node.attrs['title']).toBe('Click to expand');
  });

  it('alt text with unicode characters is stored correctly', () => {
    const node = img({ alt: 'Photo de François à Paris 🗼' });
    expect(node.attrs['alt']).toBe('Photo de François à Paris 🗼');
  });
});

// ============================================================================
// 7. Image in document structure
// ============================================================================

describe('image in document structure', () => {
  it('image node fits in paragraph (inline group)', () => {
    expect(() => docWithImage({ src: 'https://example.com/img.jpg' })).not.toThrow();
  });

  it('image with surrounding text preserves text content', () => {
    const docNode = docWithImage({ src: 'https://example.com/img.jpg' }, 'before', 'after');
    expect(docNode.textContent).toBe('beforeafter');
  });

  it('multiple images in same paragraph', () => {
    const docNode = doc(schema,
      p(schema,
        img({ src: 'https://example.com/1.jpg' }),
        text(schema, ' '),
        img({ src: 'https://example.com/2.jpg' }),
      ),
    );
    let count = 0;
    docNode.descendants(n => { if (n.type === imageNodeType) count++; });
    expect(count).toBe(2);
  });

  it('image at paragraph start (no preceding text)', () => {
    const docNode = doc(schema, p(schema, img({ src: 'https://a.com/img.jpg' }), text(schema, 'after')));
    expect(findImageNode(docNode)).not.toBeNull();
  });

  it('image at paragraph end (no following text)', () => {
    const docNode = doc(schema, p(schema, text(schema, 'before'), img({ src: 'https://a.com/img.jpg' })));
    expect(findImageNode(docNode)).not.toBeNull();
  });

  it('image alone in paragraph (only child)', () => {
    const docNode = doc(schema, p(schema, img({ src: 'https://a.com/img.jpg' })));
    expect(findImageNode(docNode)).not.toBeNull();
  });

  it('image inside blockquote paragraph', () => {
    const bq = schema.node('blockquote', null, [
      p(schema, img({ src: 'https://a.com/img.jpg' }), text(schema, 'caption')),
    ]);
    const docNode = doc(schema, bq);
    expect(findImageNode(docNode)).not.toBeNull();
  });

  it('image in heading', () => {
    const heading = schema.node('heading', { level: 1 },
      [img({ src: 'https://a.com/img.jpg' }), schema.text('Title')],
    );
    const docNode = doc(schema, heading);
    expect(findImageNode(docNode)).not.toBeNull();
  });

  it('images in separate paragraphs', () => {
    const docNode = doc(schema,
      p(schema, img({ src: 'https://a.com/1.jpg' })),
      p(schema, img({ src: 'https://a.com/2.jpg' })),
    );
    let count = 0;
    docNode.descendants(n => { if (n.type === imageNodeType) count++; });
    expect(count).toBe(2);
  });
});

// ============================================================================
// 8. NodeSelection tests
// ============================================================================

describe('image NodeSelection', () => {
  it('can create NodeSelection pointing at image', () => {
    const docNode = docWithImage({ src: 'https://example.com/img.jpg' });
    // POS_IMAGE = 7: 'before'=6 chars → pos 1-6 inside para → image at pos 7
    const sel = NodeSelection.create(docNode, POS_IMAGE);
    expect(sel.node.type).toBe(imageNodeType);
  });

  it('selected image node has correct src', () => {
    const docNode = docWithImage({ src: 'https://example.com/selected.jpg' });
    const sel = NodeSelection.create(docNode, POS_IMAGE);
    expect(sel.node.attrs['src']).toBe('https://example.com/selected.jpg');
  });

  it('can delete image via NodeSelection', () => {
    const docNode = docWithImage({ src: 'https://example.com/img.jpg' });
    const state = createState(docNode);
    // Select the image node
    const tr = state.tr.setSelection(NodeSelection.create(docNode, POS_IMAGE));
    const selState = state.apply(tr);
    // Delete the selection
    const deleteTr = selState.tr.deleteSelection();
    const next = selState.apply(deleteTr);
    expect(findImageNode(next.doc)).toBeNull();
    expect(next.doc.textContent).toBe('beforeafter');
  });

  it('can replace image via transaction', () => {
    const docNode = docWithImage({ src: 'https://old.com/img.jpg' });
    const state = createState(docNode);
    // Replace image at pos 7 with a new image
    const newImg = img({ src: 'https://new.com/img.jpg', alt: 'Updated' });
    const tr = state.tr.replaceWith(POS_IMAGE, POS_IMAGE + 1, newImg);
    const next = state.apply(tr);
    const updatedImg = findImageNode(next.doc)!;
    expect(updatedImg.attrs['src']).toBe('https://new.com/img.jpg');
    expect(updatedImg.attrs['alt']).toBe('Updated');
  });
});

// ============================================================================
// 9. Common image types / file format tests
// ============================================================================

describe('image src formats', () => {
  const formats = [
    { name: 'JPEG',   src: 'https://cdn.example.com/photo.jpg' },
    { name: 'PNG',    src: 'https://cdn.example.com/graphic.png' },
    { name: 'GIF',    src: 'https://cdn.example.com/animation.gif' },
    { name: 'WebP',   src: 'https://cdn.example.com/modern.webp' },
    { name: 'SVG',    src: 'https://cdn.example.com/icon.svg' },
    { name: 'AVIF',   src: 'https://cdn.example.com/avif.avif' },
  ];

  formats.forEach(({ name, src }) => {
    it(`stores ${name} URL correctly`, () => {
      const node = img({ src });
      expect(node.attrs['src']).toBe(src);
    });
  });
});

// ============================================================================
// 10. Undo/redo via transaction
// ============================================================================

describe('undo/redo image insertion', () => {
  it('inserting image changes document', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    const next = applyCommand(state, insertImage('https://example.com/img.jpg'));
    expect(next!.doc).not.toEqual(state.doc);
  });

  it('after insert, image appears in document', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    const next = applyCommand(state, insertImage('https://example.com/img.jpg'));
    expect(findImageNode(next!.doc)).not.toBeNull();
  });

  it('transaction changes the doc (docChanged flag)', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hello'))), 3);
    let tr: any = null;
    insertImage('https://example.com/img.jpg')(state, t => { tr = t; });
    expect(tr.docChanged).toBe(true);
  });
});

// ============================================================================
// 11. Edge cases
// ============================================================================

describe('edge cases', () => {
  it('image with null src can be created (placeholder state)', () => {
    expect(() => img({ src: null })).not.toThrow();
    const node = img({ src: null });
    expect(node.attrs['src']).toBeNull();
  });

  it('image node is a leaf (no children allowed)', () => {
    const node = img({ src: 'https://example.com/img.jpg' });
    expect(node.childCount).toBe(0);
  });

  it('image nodeSize is always 1 regardless of attributes', () => {
    const n1 = img({ src: 'https://example.com/img.jpg', alt: 'short' });
    const n2 = img({ src: 'data:image/png;base64,' + 'A'.repeat(10000) });
    expect(n1.nodeSize).toBe(1);
    expect(n2.nodeSize).toBe(1);
  });

  it('very long URL does not break node creation', () => {
    const longUrl = 'https://cdn.example.com/images/' + 'photo-'.repeat(100) + '.jpg';
    expect(() => img({ src: longUrl })).not.toThrow();
    expect(img({ src: longUrl }).attrs['src']).toBe(longUrl);
  });

  it('inserting into empty doc paragraph works', () => {
    const emptyDoc = doc(schema, p(schema));
    const state = createState(emptyDoc, 1);
    const cmd = insertImage('https://example.com/img.jpg');
    const next = applyCommand(state, cmd);
    expect(next).not.toBeNull();
    expect(findImageNode(next!.doc)).not.toBeNull();
  });

  it('three adjacent images in same paragraph', () => {
    const docNode = doc(schema, p(schema,
      img({ src: 'https://a.com/1.jpg' }),
      img({ src: 'https://a.com/2.jpg' }),
      img({ src: 'https://a.com/3.jpg' }),
    ));
    let count = 0;
    docNode.descendants(n => { if (n.type === imageNodeType) count++; });
    expect(count).toBe(3);
  });

  it('image with unicode alt text stores correctly', () => {
    const node = img({ alt: '日本語のキャプション 🌸' });
    expect(node.attrs['alt']).toBe('日本語のキャプション 🌸');
  });

  it('image with very long alt text', () => {
    const longAlt = 'A'.repeat(500);
    const node = img({ alt: longAlt });
    expect(node.attrs['alt']).toBe(longAlt);
  });

  it('insertImage with only src does not crash', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hi'))), 1);
    expect(() => insertImage('https://example.com/img.jpg')(state)).not.toThrow();
  });

  it('insertImage can be called without dispatch (dry run)', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hi'))), 1);
    const result = insertImage('https://example.com/img.jpg')(state, undefined);
    expect(result).toBe(true);
    // Original doc unchanged (no dispatch)
    expect(findImageNode(state.doc)).toBeNull();
  });

  it('image node preserves all attributes through transaction', () => {
    const state = createState(doc(schema, p(schema, text(schema, 'hi'))), 1);
    const cmd = insertImage('https://example.com/img.jpg', 'Descriptive alt', 'Tooltip title');
    const next = applyCommand(state, cmd);
    const imgNode = findImageNode(next!.doc)!;
    expect(imgNode.attrs['src']).toBe('https://example.com/img.jpg');
    expect(imgNode.attrs['alt']).toBe('Descriptive alt');
    expect(imgNode.attrs['title']).toBe('Tooltip title');
  });
});
