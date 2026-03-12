import { createPlugin } from './plugins/plugin-factory';
import { PluginManager } from './plugins/index';
import {
  applyGlobalAttrsToSpec,
  applyGlobalAttributes,
  GlobalAttributeDef,
} from './global-attributes';
import { inkstreamSchema } from './schema';
import { Schema } from '@inkstream/pm/model';

// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------

const paraSpec = {
  group: 'block',
  content: 'inline*',
  attrs: { align: { default: null } },
  parseDOM: [{
    tag: 'p',
    getAttrs(dom: HTMLElement | string) {
      return { align: (dom as HTMLElement).style?.textAlign || null };
    },
  }],
  toDOM(node: any) {
    const style = node.attrs.align ? { style: `text-align:${node.attrs.align}` } : {};
    return ['p', style, 0];
  },
};

// A spec with NO attrs / parseDOM / toDOM to verify graceful degradation.
const bareSpec = {
  group: 'block',
  content: 'inline*',
};

const analyticsAttr: GlobalAttributeDef = {
  types: ['paragraph'],
  attributes: {
    'data-analytics-id': {
      default: null,
      parseDOM: (el) => el.getAttribute('data-analytics-id'),
      renderDOM: (attrs) =>
        attrs['data-analytics-id']
          ? { 'data-analytics-id': String(attrs['data-analytics-id']) }
          : {},
    },
  },
};

// ---------------------------------------------------------------------------
// applyGlobalAttrsToSpec — unit tests
// ---------------------------------------------------------------------------

describe('applyGlobalAttrsToSpec()', () => {
  it('adds the attribute with its default to the attrs dict', () => {
    const patched = applyGlobalAttrsToSpec(paraSpec, analyticsAttr.attributes);
    expect(patched.attrs['data-analytics-id']).toEqual({ default: null });
    // Original attrs are preserved
    expect(patched.attrs.align).toEqual({ default: null });
  });

  it('does not mutate the original spec', () => {
    applyGlobalAttrsToSpec(paraSpec, analyticsAttr.attributes);
    expect((paraSpec.attrs as any)['data-analytics-id']).toBeUndefined();
  });

  it('works on a spec that has no attrs, parseDOM, or toDOM', () => {
    const patched = applyGlobalAttrsToSpec(bareSpec, analyticsAttr.attributes);
    expect(patched.attrs['data-analytics-id']).toEqual({ default: null });
    expect(patched.parseDOM).toBeUndefined();
    expect(patched.toDOM).toBeUndefined();
  });

  // parseDOM wrapping ----------------------------------------------------------
  describe('parseDOM wrapping', () => {
    it('extracts the global attribute via parseDOM extractor', () => {
      const patched = applyGlobalAttrsToSpec(paraSpec, analyticsAttr.attributes);
      const rule = patched.parseDOM[0];
      const el = {
        getAttribute: (name: string) => name === 'data-analytics-id' ? 'page-intro' : null,
        style: { textAlign: '' },
      } as unknown as HTMLElement;
      const result = rule.getAttrs(el);
      expect(result).toMatchObject({ 'data-analytics-id': 'page-intro' });
    });

    it('preserves original attrs when getAttrs also returns values', () => {
      const patched = applyGlobalAttrsToSpec(paraSpec, analyticsAttr.attributes);
      const rule = patched.parseDOM[0];
      const el = {
        getAttribute: (_: string) => 'abc',
        style: { textAlign: 'center' },
      } as unknown as HTMLElement;
      const result = rule.getAttrs(el);
      expect(result).toMatchObject({ align: 'center', 'data-analytics-id': 'abc' });
    });

    it('propagates false (element rejection) from original getAttrs', () => {
      const rejectingSpec = {
        ...paraSpec,
        parseDOM: [{
          tag: 'p',
          getAttrs: () => false as const,
        }],
      };
      const patched = applyGlobalAttrsToSpec(rejectingSpec, analyticsAttr.attributes);
      const result = patched.parseDOM[0].getAttrs({} as HTMLElement);
      expect(result).toBe(false);
    });

    it('extracts global attr even when original spec has no getAttrs', () => {
      const specNoGetAttrs = {
        group: 'block',
        content: 'inline*',
        parseDOM: [{ tag: 'p' }],
        toDOM: () => ['p', 0],
      };
      const patched = applyGlobalAttrsToSpec(specNoGetAttrs, analyticsAttr.attributes);
      const rule = patched.parseDOM[0];
      const el = {
        getAttribute: (_: string) => 'my-id',
        style: {},
      } as unknown as HTMLElement;
      const result = rule.getAttrs(el);
      expect(result).toMatchObject({ 'data-analytics-id': 'my-id' });
    });
  });

  // toDOM wrapping -------------------------------------------------------------
  describe('toDOM wrapping', () => {
    it('merges renderDOM output into an existing attrs dict at index 1', () => {
      const patched = applyGlobalAttrsToSpec(paraSpec, analyticsAttr.attributes);
      const node = { attrs: { align: null, 'data-analytics-id': 'hero' } };
      const result = patched.toDOM(node) as any[];
      expect(result[0]).toBe('p');
      expect(result[1]).toMatchObject({ 'data-analytics-id': 'hero' });
    });

    it('inserts attrs dict when original toDOM has none at index 1', () => {
      const specNoAttrsInDOM = {
        group: 'block',
        content: 'inline*',
        toDOM: () => ['p', 0] as any,
      };
      const patched = applyGlobalAttrsToSpec(specNoAttrsInDOM, analyticsAttr.attributes);
      const node = { attrs: { 'data-analytics-id': 'sidebar' } };
      const result = patched.toDOM(node) as any[];
      expect(result[1]).toMatchObject({ 'data-analytics-id': 'sidebar' });
    });

    it('omits the attribute when renderDOM returns an empty object', () => {
      const patched = applyGlobalAttrsToSpec(paraSpec, analyticsAttr.attributes);
      const node = { attrs: { align: null, 'data-analytics-id': null } };
      const result = patched.toDOM(node) as any[];
      expect(result[1]['data-analytics-id']).toBeUndefined();
    });

    it('leaves non-array toDOM output untouched', () => {
      const specStringToDOM = {
        inline: true,
        group: 'inline',
        toDOM: (node: any) => node.text || '',
      };
      const patched = applyGlobalAttrsToSpec(specStringToDOM, analyticsAttr.attributes);
      const result = patched.toDOM({ text: 'hello', attrs: { 'data-analytics-id': 'x' } });
      expect(result).toBe('hello');
    });
  });
});

// ---------------------------------------------------------------------------
// applyGlobalAttributes — higher-level helper
// ---------------------------------------------------------------------------

describe('applyGlobalAttributes()', () => {
  it('patches nodes matching the types list', () => {
    const { nodes } = applyGlobalAttributes(
      { paragraph: paraSpec },
      {},
      [analyticsAttr],
    );
    expect(nodes.paragraph.attrs['data-analytics-id']).toEqual({ default: null });
  });

  it('patches marks matching the types list', () => {
    const markSpec = {
      parseDOM: [{ tag: 'strong' }],
      toDOM: () => ['strong', 0],
    };
    const markAttr: GlobalAttributeDef = {
      types: ['strong'],
      attributes: { 'data-source': { default: null, parseDOM: (el) => el.getAttribute('data-source') } },
    };
    const { marks } = applyGlobalAttributes({}, { strong: markSpec }, [markAttr]);
    expect(marks.strong.attrs['data-source']).toEqual({ default: null });
  });

  it('does not mutate original dicts', () => {
    const nodes = { paragraph: paraSpec };
    applyGlobalAttributes(nodes, {}, [analyticsAttr]);
    expect((paraSpec.attrs as any)['data-analytics-id']).toBeUndefined();
  });

  it('ignores types that are not registered', () => {
    const attr: GlobalAttributeDef = {
      types: ['non-existent-type'],
      attributes: { foo: { default: 'bar' } },
    };
    // Should not throw
    expect(() => applyGlobalAttributes({ paragraph: paraSpec }, {}, [attr])).not.toThrow();
  });

  it('handles multiple defs for the same type (cumulative patching)', () => {
    const def1: GlobalAttributeDef = {
      types: ['paragraph'],
      attributes: { 'data-id': { default: null } },
    };
    const def2: GlobalAttributeDef = {
      types: ['paragraph'],
      attributes: { 'data-lang': { default: 'en' } },
    };
    const { nodes } = applyGlobalAttributes({ paragraph: paraSpec }, {}, [def1, def2]);
    expect(nodes.paragraph.attrs['data-id']).toEqual({ default: null });
    expect(nodes.paragraph.attrs['data-lang']).toEqual({ default: 'en' });
  });

  it('returns input unchanged when globalAttrDefs is empty', () => {
    const nodes = { paragraph: paraSpec };
    const marks = { strong: {} };
    const result = applyGlobalAttributes(nodes, marks, []);
    expect(result.nodes).toBe(nodes);
    expect(result.marks).toBe(marks);
  });
});

// ---------------------------------------------------------------------------
// Plugin addGlobalAttributes hook + PluginManager
// ---------------------------------------------------------------------------

describe('createPlugin addGlobalAttributes + PluginManager', () => {
  it('globalAttributes is set on the plugin returned by createPlugin()', () => {
    const plugin = createPlugin({
      name: 'analytics',
      addGlobalAttributes: () => [analyticsAttr],
    });
    expect(plugin.globalAttributes).toHaveLength(1);
    expect(plugin.globalAttributes![0].types).toContain('paragraph');
  });

  it('globalAttributes is undefined when addGlobalAttributes is not provided', () => {
    const plugin = createPlugin({ name: 'plain' });
    expect(plugin.globalAttributes).toBeUndefined();
  });

  it('PluginManager.getGlobalAttributes() aggregates from all plugins', () => {
    const def1: GlobalAttributeDef = {
      types: ['paragraph'],
      attributes: { 'data-a': { default: null } },
    };
    const def2: GlobalAttributeDef = {
      types: ['heading'],
      attributes: { 'data-b': { default: null } },
    };
    const p1 = createPlugin({ name: 'plugin1', addGlobalAttributes: () => [def1] });
    const p2 = createPlugin({ name: 'plugin2', addGlobalAttributes: () => [def2] });
    const manager = new PluginManager();
    manager.registerPlugin(p1);
    manager.registerPlugin(p2);
    const all = manager.getGlobalAttributes();
    expect(all).toHaveLength(2);
    expect(all[0].types).toContain('paragraph');
    expect(all[1].types).toContain('heading');
  });

  it('PluginManager.getGlobalAttributes() returns [] when no plugins declare global attrs', () => {
    const manager = new PluginManager();
    manager.registerPlugin(createPlugin({ name: 'plain' }));
    expect(manager.getGlobalAttributes()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// inkstreamSchema integration
// ---------------------------------------------------------------------------

describe('inkstreamSchema with global attributes', () => {
  function buildManager(extraAttrs?: GlobalAttributeDef) {
    const paraPlugin = createPlugin({
      name: 'paragraph',
      nodes: {
        paragraph: {
          group: 'block',
          content: 'inline*',
          attrs: { align: { default: null } },
          parseDOM: [{
            tag: 'p',
            getAttrs: (dom: any) => ({ align: dom.style?.textAlign || null }),
          }],
          toDOM: (node: any) => ['p', node.attrs.align ? { style: `text-align:${node.attrs.align}` } : {}, 0],
        },
      },
    });

    const analyticsPlugin = createPlugin({
      name: 'analytics',
      ...(extraAttrs ? { addGlobalAttributes: () => [extraAttrs] } : {}),
    });

    const manager = new PluginManager();
    manager.registerPlugin(paraPlugin);
    manager.registerPlugin(analyticsPlugin);
    return manager;
  }

  it('schema includes global attribute in the paragraph node type', () => {
    const manager = buildManager(analyticsAttr);
    const schema = inkstreamSchema(manager);
    const paraType = schema.nodes.paragraph;
    expect(paraType).toBeDefined();
    // ProseMirror stores attrs on the node type's spec.attrs
    expect(paraType.spec.attrs!['data-analytics-id']).toBeDefined();
  });

  it('schema without global attrs still builds correctly', () => {
    const manager = buildManager();
    expect(() => inkstreamSchema(manager)).not.toThrow();
  });

  it('extended plugin inherits addGlobalAttributes', () => {
    const base = createPlugin({
      name: 'analytics',
      addGlobalAttributes: () => [analyticsAttr],
    });
    const child = base.extend({ name: 'custom-analytics' });
    expect(child.globalAttributes).toHaveLength(1);
  });
});
