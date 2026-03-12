/**
 * Global Attributes
 *
 * Allows plugins to inject extra attributes onto *existing* node/mark types
 * without owning those types. Attributes are merged into node/mark specs
 * before the ProseMirror Schema is constructed, so they participate fully
 * in ProseMirror's attribute system (stored in doc, serialised/parsed via
 * `parseDOM`/`toDOM`, accessible via `node.attrs`).
 *
 * Usage in a plugin:
 * ```ts
 * createPlugin({
 *   name: 'analytics',
 *   addGlobalAttributes: () => [{
 *     types: ['paragraph', 'heading'],
 *     attributes: {
 *       'data-analytics-id': {
 *         default: null,
 *         parseDOM: el => el.getAttribute('data-analytics-id'),
 *         renderDOM: attrs => ({ 'data-analytics-id': attrs['data-analytics-id'] }),
 *       },
 *     },
 *   }],
 * });
 * ```
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Describes a single attribute that is injected onto one or more node/mark types.
 */
export interface GlobalAttributeSpec {
  /**
   * Default value used when the attribute is absent from the document.
   * **Must** be provided — ProseMirror requires every attribute to have a default.
   */
  default: unknown;
  /**
   * Extract the attribute value from a DOM element during HTML parsing.
   * Receives the matched DOM element; return the attribute value.
   * If omitted the attribute will always receive its `default` when parsing HTML.
   */
  parseDOM?: (element: HTMLElement) => unknown;
  /**
   * Return a DOM attribute dictionary to merge into the node/mark's serialised
   * DOM output. Return `null` or an empty object to skip rendering this
   * attribute for a given node (e.g. when the value equals the default).
   *
   * Example:
   * ```ts
   * renderDOM: attrs => attrs['data-id'] ? { 'data-id': String(attrs['data-id']) } : {}
   * ```
   */
  renderDOM?: (attrs: Record<string, unknown>) => Record<string, string | null | undefined> | null;
}

/** A single `addGlobalAttributes` descriptor returned by a plugin. */
export interface GlobalAttributeDef {
  /** Names of the node/mark types that should receive these attributes. */
  types: string[];
  /** Map of attribute name → spec. */
  attributes: Record<string, GlobalAttributeSpec>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Merges extra DOM attributes (from `renderDOM`) into an existing
 * ProseMirror `DOMOutputSpec` array, respecting the optional attrs-dict
 * at index 1. Null/undefined values are omitted from the output.
 *
 * @internal
 */
function mergeAttrsIntoDOMSpec(
  spec: readonly any[],
  extraAttrs: Record<string, string | null | undefined>,
): readonly any[] {
  // Strip falsy values so we don't emit e.g. data-id="null".
  const toAdd: Record<string, string> = {};
  for (const [k, v] of Object.entries(extraAttrs)) {
    if (v !== null && v !== undefined && v !== '') toAdd[k] = v;
  }
  if (Object.keys(toAdd).length === 0) return spec;

  const [tag, second, ...tail] = spec;

  // Second element is an attrs dict when it's a plain object (not 0 / array / string).
  if (
    second !== undefined &&
    second !== 0 &&
    typeof second === 'object' &&
    !Array.isArray(second)
  ) {
    return [tag, { ...second, ...toAdd }, ...tail];
  }

  // No attrs dict present — insert one.
  if (second === undefined) {
    return [tag, toAdd];
  }
  return [tag, toAdd, second, ...tail];
}

/**
 * Computes the extra DOM attrs for a node/mark by calling each `renderDOM`
 * function, then merges the results into a single flat dict.
 *
 * @internal
 */
function computeRenderAttrs(
  nodeAttrs: Record<string, unknown>,
  attrSpecs: Record<string, GlobalAttributeSpec>,
): Record<string, string | null | undefined> {
  const out: Record<string, string | null | undefined> = {};
  for (const [name, spec] of Object.entries(attrSpecs)) {
    if (spec.renderDOM) {
      const rendered = spec.renderDOM(nodeAttrs) ?? {};
      Object.assign(out, rendered);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Core patching function
// ---------------------------------------------------------------------------

/**
 * Returns a **new** node or mark spec with the given global attributes merged in.
 *
 * Three things are patched:
 * 1. `attrs` — adds each attribute with its declared default.
 * 2. `parseDOM` — wraps each rule's `getAttrs` to also extract global attrs.
 * 3. `toDOM` — wraps the function to merge `renderDOM` output into the
 *    serialised DOM element's attribute dict.
 *
 * The original spec object is **never mutated**.
 *
 * @internal
 */
export function applyGlobalAttrsToSpec(
  spec: Record<string, any>,
  globalAttrs: Record<string, GlobalAttributeSpec>,
): Record<string, any> {
  const result: Record<string, any> = { ...spec };

  // ── 1. attrs ──────────────────────────────────────────────────────────────
  const newAttrDefs: Record<string, { default: unknown }> = {};
  for (const [name, attrSpec] of Object.entries(globalAttrs)) {
    newAttrDefs[name] = { default: attrSpec.default };
  }
  result.attrs = { ...(spec.attrs ?? {}), ...newAttrDefs };

  // ── 2. parseDOM ───────────────────────────────────────────────────────────
  if (Array.isArray(spec.parseDOM)) {
    result.parseDOM = spec.parseDOM.map((rule: any) => {
      const origGetAttrs = rule.getAttrs as
        | ((dom: HTMLElement | string) => Record<string, unknown> | false | null | undefined)
        | undefined;

      return {
        ...rule,
        getAttrs(dom: HTMLElement | string) {
          const baseResult = origGetAttrs ? origGetAttrs(dom) : undefined;
          // false means "this rule doesn't match this element" — preserve that.
          if (baseResult === false) return false;
          const baseAttrs: Record<string, unknown> = baseResult ?? {};

          // Extract global attrs from the DOM element.
          const extraAttrs: Record<string, unknown> = {};
          if (typeof dom !== 'string') {
            for (const [name, attrSpec] of Object.entries(globalAttrs)) {
              if (attrSpec.parseDOM) {
                extraAttrs[name] = attrSpec.parseDOM(dom as HTMLElement);
              }
            }
          }

          return { ...baseAttrs, ...extraAttrs };
        },
      };
    });
  }

  // ── 3. toDOM ──────────────────────────────────────────────────────────────
  if (typeof spec.toDOM === 'function') {
    const origToDOM = spec.toDOM as (nodeOrMark: any, ...args: any[]) => any;

    result.toDOM = function (nodeOrMark: any, ...rest: any[]) {
      const domSpec = origToDOM(nodeOrMark, ...rest);
      if (!Array.isArray(domSpec)) return domSpec;

      const attrs: Record<string, unknown> =
        nodeOrMark && typeof nodeOrMark === 'object' ? (nodeOrMark.attrs ?? {}) : {};

      const extraAttrs = computeRenderAttrs(attrs, globalAttrs);
      return mergeAttrsIntoDOMSpec(domSpec, extraAttrs);
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// High-level helpers
// ---------------------------------------------------------------------------

/**
 * Applies all global attribute definitions from a set of plugins to the
 * provided node and mark spec dictionaries.
 *
 * Returns **new** dictionaries; originals are never mutated. Call this
 * before constructing the ProseMirror `Schema`.
 */
export function applyGlobalAttributes(
  nodes: Record<string, any>,
  marks: Record<string, any>,
  globalAttrDefs: GlobalAttributeDef[],
): { nodes: Record<string, any>; marks: Record<string, any> } {
  if (globalAttrDefs.length === 0) return { nodes, marks };

  // Shallow-copy so we can replace individual specs without touching originals.
  const patchedNodes = { ...nodes };
  const patchedMarks = { ...marks };

  for (const { types, attributes } of globalAttrDefs) {
    for (const typeName of types) {
      if (patchedNodes[typeName]) {
        patchedNodes[typeName] = applyGlobalAttrsToSpec(patchedNodes[typeName], attributes);
      } else if (patchedMarks[typeName]) {
        patchedMarks[typeName] = applyGlobalAttrsToSpec(patchedMarks[typeName], attributes);
      }
      // Unknown type names are silently ignored so plugins can declare
      // attributes for types that may not be registered in all configurations.
    }
  }

  return { nodes: patchedNodes, marks: patchedMarks };
}
