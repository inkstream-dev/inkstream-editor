# Tiptap vs Inkstream — Side-by-Side Comparison

> Reference document for development decisions. Based on audit of Tiptap v3.20.1
> and Inkstream v0.1.x (March 2026).

---

## Package Structure

| Aspect | Tiptap | Inkstream |
|--------|--------|-----------|
| Total packages | 59 | ~28 (23 plugins + 3 core + 1 demo + 1 eslint-config) |
| Versioning | Monolithic (all at 3.20.1) | Independent per-package |
| Monorepo tool | pnpm + Turbo | pnpm + Turbo ✅ (same) |
| Build tool | tsup (ESM + CJS + .d.ts) | tsup (ESM + CJS + .d.ts) ✅ (same) |
| ProseMirror wrapper | `@tiptap/pm` (15 subpaths) | `@inkstream/pm` (9 subpaths) ✅ |
| Starter kit | `@tiptap/starter-kit` | `@inkstream/starter-kit` ✅ |
| Framework integrations | React, Vue 2, Vue 3, static | React only |
| Private/pro packages | None (all MIT) | `@inkstream-dev/pro-plugins` |
| Changeset versioning | ✅ `@changesets/cli` | ❌ Manual bumps |

---

## Extension / Plugin System

| Aspect | Tiptap | Inkstream |
|--------|--------|-----------|
| Base abstraction | `Extension` / `Node` / `Mark` classes | `createPlugin<TOptions>()` factory |
| Schema contribution | Each extension owns its schema | ⚠️ Core marks hardcoded in `schema.ts` |
| Schema construction | Dynamic from extensions at init | Dynamic from `PluginManager` at init ✅ |
| Options pattern | `addOptions()` + `configure()` | `addOptions()` + `pluginOptions` prop ✅ |
| Options type safety | TypeScript generics | TypeScript generics ✅ |
| Extension inheritance | `Extension.extend()` | ❌ No inheritance |
| `addStorage()` | ✅ Reactive per-extension state | ❌ Missing |
| `addCommands()` | ✅ Chainable command registry | ❌ Raw PM commands only |
| `addKeyboardShortcuts()` | ✅ Declarative map | ✅ `getKeymap()` |
| `addInputRules()` | ✅ | ✅ `getInputRules()` |
| `addPasteRules()` | ✅ | ❌ Missing |
| `addProseMirrorPlugins()` | ✅ | ✅ `getProseMirrorPlugins()` |
| `addGlobalAttributes()` | ✅ Cross-extension attr injection | ❌ Missing |
| `addNodeView()` | ✅ Per-extension node views | ❌ One-off in react-editor |
| Lifecycle hooks | 10+ (onCreate, onUpdate, onFocus…) | ❌ None |
| Priority ordering | ✅ Numeric priority per extension | ❌ Registration order only |

---

## React Integration

| Aspect | Tiptap | Inkstream |
|--------|--------|-----------|
| Main hook | `useEditor()` | Inline in `RichTextEditor` component |
| Subscriptions | `useSyncExternalStore` (React 18) | Custom `EditorStateStore` pub/sub |
| SSR support | ✅ `immediatelyRender: false` | ❌ No SSR-safe option |
| Node views | `ReactNodeViewRenderer(Component)` | ❌ One-off `ImageNodeView.tsx` |
| Editor state selector | `useEditorState(selector)` | ❌ No selector hook |
| Built-in toolbar | ❌ Headless | ✅ `toolbarLayout` declarative ordering |
| Built-in theming | ❌ None | ✅ CSS variable system, dark mode |
| Theme API | ❌ | ✅ `theme: 'auto' | 'light' | 'dark'` |
| Table dialog | N/A | Via `EditorWithTableDialog` wrapper |
| Editor view access | Via `editor.view` (proper) | ⚠️ `window.__inkstreamEditorView__` |

---

## Commands API

| Aspect | Tiptap | Inkstream |
|--------|--------|-----------|
| Chainable API | ✅ `.chain().toggleBold().run()` | ❌ Raw PM commands |
| Dry-run check | ✅ `.can().toggleBold()` | ❌ Not available |
| Command context | `{ commands, chain, state, view, tr, dispatch }` | Raw PM `(state, dispatch, view)` |
| Unified registry | ✅ All commands on `editor.commands` | ❌ Per-plugin closures |
| Undo/Redo | Via `history` extension + commands | Via `history` plugin + PM direct |

---

## Licensing / Commercial Model

| Aspect | Tiptap | Inkstream |
|--------|--------|-----------|
| License | MIT (fully open) | MIT core + proprietary pro tier |
| Tiers | None | `free` / `pro` / `premium` |
| Key format | N/A | `INKSTREAM-{TIER}-[A-Z0-9]+` |
| Validation | N/A | Server-side API endpoint |
| Secure default | N/A | ✅ No endpoint → always free |
| Pro distribution | N/A | Private npm registry (GitHub Packages) |
| Lazy loading | N/A | ✅ `useLazyPlugins` code splitting |
| Runtime guard | N/A | ✅ `guardPlugin()` stubs on tier fail |

---

## Build & Publishing

| Aspect | Tiptap | Inkstream |
|--------|--------|-----------|
| Build tool | tsup 8.5.1 | tsup 8.5.1 ✅ (same version) |
| ESM output | ✅ `dist/index.js` | ✅ `dist/index.mjs` |
| CJS output | ✅ `dist/index.cjs` | ✅ `dist/index.js` |
| Type defs | ✅ dual `.d.ts` + `.d.cts` | ✅ `.d.ts` + `.d.mts` |
| Source maps | ✅ | ✅ |
| `sideEffects: false` | ✅ (tree-shakeable) | ❓ Not consistently set |
| Published files | `["src", "dist"]` | `["dist"]` |
| Changeset versioning | ✅ | ❌ |
| Committed build artifacts | ❌ clean | ⚠️ `.js` files in `editor-core/src/` |

---

## Testing

| Aspect | Tiptap | Inkstream |
|--------|--------|-----------|
| Framework | Vitest + Playwright | Jest + ts-jest |
| Test location | `packages/*/src/*.test.ts` | `packages/*/src/*.test.ts` ✅ |
| Coverage thresholds | Vitest (no stated threshold) | 70% lines/statements, 60% branches |
| E2E | Playwright (Cypress legacy) | None |
| Test utilities | Tiptap-internal helpers | `test-utils/` package in editor-core ✅ |
| Node environment | jsdom (browser-like) | `node` environment |

---

## Developer Experience

| Aspect | Tiptap | Inkstream |
|--------|--------|-----------|
| Documentation | tiptap.dev (rich, full examples) | README + DISTRIBUTION.md |
| "Zero to editor" | `npm i @tiptap/react @tiptap/starter-kit` | `npm i @inkstream/react-editor` |
| Custom extension steps | 1 file + register in `useEditor` | Create package + register in starter-kit |
| TypeScript quality | Excellent (5.7, strict) | Good (5.3, generics) |
| Intellisense for commands | ✅ Fully typed `editor.commands.*` | ❌ Raw PM functions |
| Framework agnostic | ✅ React, Vue 2/3, Vanilla | React only |
| Community | Large (12k+ GitHub stars) | Early stage |

---

## Summary: Strengths & Weaknesses

### Inkstream Strengths (vs Tiptap)
1. **Built-in toolbar** with `toolbarLayout` ordering — huge DX win over headless
2. **CSS variable theming** out of the box — dark mode, custom accent colors
3. **Server-validated license tiers** — commercial model Tiptap can't replicate
4. **`useLazyPlugins`** — code-split pro features behind license validation
5. **`guardPlugin()` stubs** — dual-layer protection against license circumvention
6. **`@inkstream/pm` wrapper** — same smart pattern as Tiptap

### Inkstream Weaknesses (vs Tiptap)
1. **No lifecycle hooks** — plugins can't react to editor events
2. **Schema not fully composed** — core marks hardcoded in `schema.ts`
3. **No chainable commands** — raw ProseMirror API leaks to consumers
4. **No paste rules** — can't auto-format pasted content
5. **No plugin storage** — plugins can't maintain state
6. **`window.__inkstreamEditorView__` global** — anti-pattern, breaks SSR
7. **Committed build artifacts** — `.js` files in `src/` pollute git history
8. **React only** — no Vue, Svelte, or vanilla JS integration
9. **No SSR support** — no `immediatelyRender` equivalent
10. **No changeset versioning** — manual version management

### Priority Order for Closing Gaps
1. Move mark/node specs into plugin packages (correctness)
2. Remove committed build artifacts (cleanliness)
3. Fix `window.__inkstreamEditorView__` anti-pattern (correctness)
4. Add lifecycle hooks (extensibility)
5. Add paste rules (feature parity)
6. Add plugin storage (extensibility)
7. Add chainable commands (DX)
8. Add SSR support (correctness)
9. Add `Extension.extend()` (DX)
10. Add `@changesets/cli` (ops)
