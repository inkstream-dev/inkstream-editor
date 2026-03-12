# Inkstream Architecture Analysis
## Tiptap Benchmark Study — Internal Notes

> Internal architectural observations based on a full code audit of both the Tiptap
> source (`/Users/yogesh/docker/tiptap` — v3.20.1) and the Inkstream project (March 2026).
> Use these notes when making design decisions, reviewing PRs, or planning refactors.

---

## 1. Tiptap Architecture — Key Observations

### Package Structure (59 packages)

```
@tiptap/pm             — ProseMirror wrapper (all 15+ PM packages as subpath exports)
@tiptap/core           — Headless editor engine (~188 TS files)
@tiptap/react          — useEditor, EditorContent, ReactRenderer, node views
@tiptap/vue-3          — Vue 3 composables (same core, different framework layer)
@tiptap/vue-2          — Vue 2 integration
@tiptap/starter-kit    — Bundled extension kit (20+ extensions in one)
@tiptap/extension-*    — 42 individual extension packages
@tiptap/suggestion     — Mention/slash-command suggestion utility
@tiptap/html           — HTML serialisation utility
@tiptap/markdown       — Markdown serialisation utility
```

**Versioning:** Monolithic — all 59 packages share a single version number (3.20.1).

### The `@tiptap/pm` Wrapper Pattern

Tiptap wraps all ProseMirror packages in a single `@tiptap/pm` package with 15 subpath
exports. This prevents version divergence and provides a single upgrade point:

```ts
import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
```

**Inkstream equivalent:** `@inkstream/pm` (already implemented, 9 subpath exports). ✅

### Extension System (the key differentiator)

Tiptap's extension system is a **declarative abstraction layer** over ProseMirror that
solves the most common ProseMirror pain points. Three base classes:

- **`Extension`** — pure extensions (no schema nodes/marks); for keyboard shortcuts,
  global commands, paste rules
- **`Node`** — block-level schema nodes (paragraph, heading, image, etc.)
- **`Mark`** — inline schema marks (bold, italic, link, etc.)

All three extend a common `Extendable` base class providing:
- `extend(config)` — inheritance / overriding parent config
- `configure(options)` — non-destructive option override (returns new instance)
- Priority-based ordering

**Key lifecycle hooks available in every extension:**

```ts
addOptions()             // Typed option defaults
addStorage()             // Reactive extension state
addCommands()            // Register chainable commands
addKeyboardShortcuts()   // Declarative key → command map
addInputRules()          // Regex auto-formatting on type
addPasteRules()          // Regex auto-formatting on paste
addProseMirrorPlugins()  // Escape hatch to native PM plugins
addGlobalAttributes()    // Inject attrs into other nodes/marks cross-extension
addNodeView()            // Custom React/Vue rendering for this node
addMarkView()            // Custom React/Vue rendering for this mark
addExtensions()          // Compose sub-extensions (for kits)
onCreate()               // After editor initialised
onUpdate()               // After every document change
onFocus() / onBlur()     // Focus/blur events
onDestroy()              // Before editor destroyed
onMount() / onUnmount()  // DOM lifecycle
parseHTML() / renderHTML() // Schema serialisation
parseMarkdown() / renderMarkdown() // Markdown serialisation
transformPastedHTML()    // Pre-parse paste transform
```

### Chainable Commands

All extension commands are aggregated and exposed via a unified, chainable API:

```ts
editor.chain()
  .focus()
  .toggleBold()
  .toggleItalic()
  .run();

// Dry-run (returns boolean)
editor.can().chain().toggleBold().run();
```

Command context available in every command:
```ts
({ commands, chain, editor, state, view, tr, dispatch }) => boolean
```

### Dynamic Schema Construction

Schema is built at editor initialisation by `ExtensionManager`:

1. `resolveExtensions()` — flattens nested extensions, sorts by priority
2. `getSchemaByResolvedExtensions()` — builds `new Schema({ nodes, marks })` from
   all Node and Mark extensions
3. `getAttributesFromExtensions()` — merges `addAttributes()` and `addGlobalAttributes()`

The schema is **never hardcoded**. Every aspect comes from extensions.

### React Integration

- **`useEditor()`** — Creates and manages editor lifecycle; uses `useSyncExternalStore`
  for concurrent-mode-safe subscription to editor state changes
- **`useEditorState(selector)`** — Selector-based hook to subscribe to specific parts
  of editor state without re-rendering on unrelated changes
- **`ReactNodeViewRenderer(Component)`** — Renders a React component inside a
  ProseMirror node view via a hidden portal
- **SSR support** — `immediatelyRender: false` returns `null` server-side to prevent
  hydration mismatches

### Build Setup

- **Tool:** `tsup` (Rust/esbuild-based TypeScript bundler)
- **Output:** Dual ESM + CJS + `.d.ts` + source maps per package
- **`sideEffects: false`** on all packages → tree-shaking friendly
- **Versioning:** `@changesets/cli` for atomic bumps + CHANGELOG generation

---

## 2. Inkstream Architecture — Assessment

### What Inkstream Does Well

#### `createPlugin<TOptions>` factory (unique to Inkstream)
The typed plugin factory with `addOptions()` and `this.options` context binding is
a good DX. It's equivalent to Tiptap's `Extension.create()` but baked into the factory.

#### Server-validated licensing (Inkstream's key differentiator)
No equivalent in Tiptap (MIT, no tiers). Inkstream's two-layer model:
1. Private npm registry (`@inkstream-dev:registry=https://npm.pkg.github.com`)
2. Runtime `guardPlugin()` stub when tier is insufficient

This is architecturally sound and is the primary reason Inkstream can be a commercial
product while Tiptap cannot.

#### `useLazyPlugins` / code-split pro distribution
Code-splitting pro plugins behind server-validated tier is clever. Only downloads pro
code after server confirms the license. No Tiptap equivalent.

#### `EditorStateStore` pub/sub
Decouples toolbar button re-renders from React's render cycle. Efficient, but should
be migrated to `useSyncExternalStore` (React 18's first-class subscription primitive).

#### `@inkstream/pm` re-export layer
Mirrors Tiptap's pattern. A single upgrade point for all ProseMirror packages.

#### CSS variable theming
Inkstream ships a polished theming system out of the box. Tiptap ships zero CSS.
This is a genuine competitive advantage.

#### `toolbarLayout` declarative ordering
Array-based toolbar composition with `'|'` separator tokens is simple and effective.
Tiptap has no toolbar at all.

---

### Where Inkstream Has Gaps

#### Gap 1: Core marks not owned by plugin packages

Currently `schema.ts` hardcodes these marks: `link`, `strong`, `em`, `underline`,
`strike`, `code`. This means:
- `packages/bold/` provides keymap + toolbar but **not** the `strong` mark spec
- If you exclude `boldPlugin`, the `strong` mark still exists in the schema
- Schema is not truly composed from plugins

**Fix:** Each plugin package should own its mark/node spec (move out of `schema.ts`).

#### Gap 2: No lifecycle hooks

The `Plugin` interface has no `onCreate`, `onUpdate`, `onDestroy` etc. hooks. Plugins
cannot react to editor events — they can only contribute ProseMirror state plugins
(which is a much lower-level primitive).

**Fix:** Add lifecycle hooks to `PluginConfig` in `plugin-factory.ts`, forwarded from
the `RichTextEditor` component lifecycle.

#### Gap 3: No chainable commands API

Inkstream exposes raw ProseMirror commands directly. Consumers must know the PM
command API. Tiptap's `.chain().toggleBold().run()` API is significantly better DX.

**Fix:** Introduce a `CommandManager` that wraps plugin-contributed commands behind a
chainable interface.

#### Gap 4: No paste rules

`createPlugin` supports `getInputRules` but has no `getPasteRules`. Auto-formatting on
paste (e.g., converting `**text**` to bold when pasting) is not possible without a
custom ProseMirror plugin.

**Fix:** Add `getPasteRules?: (schema) => PasteRule[]` to `PluginConfig`.

#### Gap 5: No plugin storage

Plugins cannot maintain reactive state (e.g., word count, character count, link
detection). Tiptap's `addStorage()` pattern fills this need.

**Fix:** Add `addStorage?: () => TStorage` to `PluginConfig`.

#### Gap 6: `window.__inkstreamEditorView__` global

`EditorWithTableDialog` sets `window.__inkstreamEditorView__` to allow the table dialog
to access the ProseMirror view. This is an anti-pattern:
- Breaks SSR (no `window` on server)
- Allows only one editor per page
- Not testable

**Fix:** Pass an `onEditorReady(view: EditorView)` callback prop and store the ref
properly.

#### Gap 7: Compiled `.js` committed alongside `.ts` in `editor-core`

`packages/editor-core/src/` has both `.ts` source and compiled `.js` files checked in.
This causes:
- Misleading `git diff` on every rebuild
- Confusion about which file is canonical
- Double-maintenance burden

**Fix:** Add `src/**/*.js` and `src/**/*.d.ts` to `.gitignore` for `editor-core`.

#### Gap 8: No `Extension.extend()` inheritance

Once a plugin is created, it cannot be subclassed or overridden. Tiptap's `extend()`
pattern allows teams to customise official extensions without forking them.

**Fix:** Add `.extend(config: Partial<PluginConfig>)` method to the plugin object
returned by `createPlugin()`.

#### Gap 9: No `addGlobalAttributes()`

Plugins cannot inject attributes into other plugins' nodes. Use cases:
- Analytics plugin adding `data-analytics-id` to all block nodes
- Accessibility plugin adding `aria-*` to image nodes

**Fix:** Add `addGlobalAttributes?: () => GlobalAttributeConfig[]` to `PluginConfig`.

#### Gap 10: No first-class node view API in `createPlugin`

Custom React rendering for nodes (like images) is currently a one-off in
`packages/react-editor/src/ImageNodeView.tsx`. The plugin system has no way to declare
"use this React component to render my node".

**Fix:** Add `addNodeView?: () => NodeViewRenderer` to `PluginConfig` (framework-agnostic
in editor-core; React binding in react-editor).

#### Gap 11: No SSR-safe initialisation

`RichTextEditor` always runs `new EditorView()` on mount. In Next.js App Router with
SSR, this can cause hydration mismatches if the initial HTML differs.

**Fix:** Add `immediatelyRender?: boolean` prop, deferring editor creation to
`useEffect` only.

#### Gap 12: No changeset-based versioning

Package versions are bumped manually. No changelogs are auto-generated. Consumers have
no upgrade path documentation.

**Fix:** Add `@changesets/cli`, `.changeset/` directory, and a `version` turbo task.

---

## 3. Architecture Decision Records (ADRs)

### ADR-01: Keep `@inkstream/pm` wrapper

**Decision:** Maintain the `@inkstream/pm` re-export layer.

**Rationale:** Version pinning is critical for ProseMirror. A single re-export package
means upgrading PM is a one-line change. All plugins import from `@inkstream/pm/*`
rather than from `prosemirror-*` directly. This is the same proven pattern Tiptap uses.

### ADR-02: Keep server-side license validation

**Decision:** Never grant paid features based on client-side key format alone.

**Rationale:** The security model is "secure by default". No validation endpoint →
always free. Network failure → always free. Only a server `200 { isValid: true, tier }`
response elevates tier. This is non-negotiable for commercial viability.

### ADR-03: Keep `createPlugin` factory (don't switch to class hierarchy)

**Decision:** Keep `createPlugin<TOptions>()` rather than adopting class-based
`Extension.create()` / `Node.create()` / `Mark.create()` like Tiptap.

**Rationale:** A single factory function is simpler, easier to document, and avoids
JavaScript class inheritance complexity. The generic options pattern already provides
type safety. The main addition needed is a `.extend()` method on the returned object,
not a class hierarchy.

### ADR-04: Don't adopt Tiptap's separate Node/Mark/Extension split (yet)

**Decision:** Keep one `createPlugin` that handles nodes, marks, and pure extensions.

**Rationale:** Inkstream's plugin model is flatter. Most plugins contribute either a
mark OR a node, not both. The distinction adds boilerplate without yet yielding benefit.
Revisit when the extension marketplace (v1.0 goal) requires finer-grained categorisation.

### ADR-05: Keep CSS variable theming as a differentiator

**Decision:** Maintain the built-in `editor.css` theming system.

**Rationale:** Tiptap ships zero CSS. Inkstream's CSS variable system is a genuine DX
advantage. It works without a CSS-in-JS library, supports dark mode, and is trivially
overridable. Do not remove it in pursuit of "headless" purity.

---

## 4. File Map: Key Files to Know

```
packages/editor-core/src/
  plugins/index.ts         Plugin interface, PluginManager, ToolbarItem
  plugins/plugin-factory.ts createPlugin<TOptions> factory
  schema.ts                inkstreamSchema(manager) — dynamic schema builder
  license/LicenseManager.ts LicenseManager class, tier hierarchy
  license/types.ts         LicenseTier, PluginTier, ServerValidationResponse
  tableDialogBridge.ts     Module-level bridge (anti-pattern, to be replaced)
  helpers/prosemirror.ts   findParentNode, isList, getNodeType utilities
  test-utils/              createState, applyCommand, p(), doc() helpers

packages/react-editor/src/
  index.tsx                RichTextEditor component (main export)
  Toolbar.tsx              Toolbar + theme toggle
  useEditorState.ts        EditorStateStore pub/sub
  useLicenseValidation.ts  Server-side validation hook (5-min cache)
  useLazyPlugins.ts        Code-split pro plugin loader
  EditorWithTableDialog.tsx Table dialog wrapper (uses window.__ anti-pattern)
  ImageNodeView.tsx        One-off React node view for images
  editor.css               CSS custom properties, theme classes

packages/pm/src/
  model.ts, state.ts, view.ts, ...   ProseMirror re-export entry points

packages/starter-kit/src/
  index.ts                 availablePlugins map, corePlugins array

apps/demo/src/app/
  api/validate-license/route.ts  Reference license validation endpoint
  page.tsx                 Demo page with license key input, lazy pro plugins
```
