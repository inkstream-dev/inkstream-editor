# Inkstream Editor — Strategic Roadmap

> A roadmap for evolving Inkstream into a commercially viable, technically excellent
> editor SDK. Informed by a benchmark study of Tiptap's architecture and an audit of
> the current Inkstream codebase.

---

## Vision

Inkstream is a **batteries-included**, **freemium-ready** ProseMirror editor SDK for React.
Where Tiptap is fully headless (no UI, no theming, no toolbar), Inkstream ships with a
polished out-of-the-box experience while remaining deeply customisable.

**Target developers:** Teams who want a rich text editor running in under 30 minutes,
with room to grow — custom plugins, theming, tier-gated Pro features.

---

## Current State (v0.1.x)

**Strengths:**
- Full CSS theming system with 19 custom properties and dark mode
- Built-in Toolbar component with declarative `toolbarLayout`
- Server-validated license/tier system (freemium architecture)
- Plugin system with schema contributions, toolbar items, keymaps, input rules
- 700+ Jest tests
- 6 published npm packages

**Key gaps:**
- ProseMirror imported directly in every package (fragile dependency isolation)
- Schema has hardcoded core nodes (paragraph, heading, etc.) — not plugin-contributed
- Editor re-creates on toolbar changes (unnecessarily expensive)
- No typed plugin options
- No SSR support
- Toolbar re-renders on every keystroke (all buttons re-evaluate `isActive`)

---

## Short-Term — v0.2.x

**Goal:** Fix architectural mistakes without breaking the public API.

### S1 — `@inkstream/pm` wrapper package

Create a single package that owns all ProseMirror dependencies:

```
packages/pm/
  package.json  (all prosemirror-* in "dependencies")
  src/index.ts  (re-exports from each prosemirror package)
```

```json
// packages/pm/package.json
{
  "name": "@inkstream/pm",
  "exports": {
    "./model":      "./dist/model.js",
    "./state":      "./dist/state.js",
    "./view":       "./dist/view.js",
    "./commands":   "./dist/commands.js",
    "./keymap":     "./dist/keymap.js",
    "./inputrules": "./dist/inputrules.js",
    "./history":    "./dist/history.js",
    "./schema-list":"./dist/schema-list.js",
    "./transform":  "./dist/transform.js"
  }
}
```

Then update all packages to use `@inkstream/pm` as a `peerDependency`.
This eliminates the dual-instance problem at the architectural level.

**Impact:** Breaking change for internal packages only. No public API change.

---

### S2 — Separate editor init from toolbar layout

Currently, the `useEffect` that creates the `EditorView` re-runs when `toolbarLayout`
changes. These are independent concerns.

**Fix:** Split into two effects:
1. `useEffect([schema, proseMirrorPlugins])` — creates/destroys EditorView
2. `useEffect([pluginManager, schema, pluginOptions, toolbarLayout])` — builds toolbar items

This prevents the editor from being destroyed and recreated when the user changes
toolbar ordering.

---

### S3 — Toolbar performance (selective re-renders)

Every document transaction calls `setCurrentEditorState(newState)`, which re-renders
the entire Toolbar, which calls `isActive()` on every button.

**Fix:** Adopt React's `useSyncExternalStore` for the editor state subscription:

```ts
// In a new useEditorState hook:
const isBold = useEditorState({
  editor: editorViewRef.current,
  selector: (state) => isMarkActive(state, schema.marks.strong),
})
```

Each toolbar button subscribes independently and only re-renders when its own
state changes. With 20+ buttons this is a significant perf improvement.

---

### S4 — SSR safety

Add guards so the package doesn't crash in Next.js App Router server components:

```ts
// Before accessing window/document:
if (typeof window === 'undefined') return null;
```

Mark `RichTextEditor` with `"use client"` (already done). Ensure `useLicenseValidation`
handles SSR gracefully (return `{ tier: 'free' }` on server).

---

### S5 — Typed plugin options

Replace the untyped `pluginOptions: Record<string, any>` with a typed generic:

```ts
// Current:
createPlugin({ name: 'textColor', getToolbarItems: (schema, options) => ... })

// Target:
createPlugin<TextColorOptions>({
  name: 'textColor',
  addOptions() { return { palette: DEFAULT_PALETTE } },
  getToolbarItems: (schema) => {
    const { palette } = this.options;
    // ...
  }
})
```

---

## Medium-Term — v0.3.x

**Goal:** Make plugins fully first-class and the schema 100% plugin-driven.

### M1 — Plugin-contributed schema nodes

Move all hardcoded nodes from `schema.ts` into plugin-contributed nodes:

```
editor-core currently hardcodes:
  paragraph, heading (h1-h6), blockquote, code_block, image,
  horizontal_rule, text, hard_break

Target: schema.ts only defines doc and text.
All other nodes are contributed by plugins.
```

This unlocks scenarios like:
- Consumer removes heading support entirely
- Consumer replaces paragraph with a custom paragraph that has extra attrs
- Consumer reorders node priority in the schema

Migration path: Move each node into an existing plugin or create thin wrapper plugins
(`paragraphPlugin`, `hardBreakPlugin`) that are auto-included in the default set.

---

### M2 — Plugin lifecycle additions

Add missing lifecycle hooks to the `createPlugin()` contract:

```ts
createPlugin({
  name: 'myPlugin',
  
  // NEW: Typed options
  addOptions() {
    return { someConfig: 'default' }
  },
  
  // NEW: Per-plugin state (persists across transactions)
  addStorage() {
    return { lastUsedColor: null }
  },
  
  // NEW: Paste rules
  getPasteRules: (schema) => [...],
  
  // NEW: Global attributes (add attrs to nodes from other plugins)
  addGlobalAttributes() {
    return [{ types: ['paragraph', 'heading'], attributes: { 'data-custom': {} } }]
  },
  
  // NEW: Transaction observer
  onTransaction(state, prevState) {},
  
  // Existing:
  getProseMirrorPlugins, getToolbarItems, getInputRules, getKeymap,
  nodes, marks,
})
```

---

### M3 — `@inkstream/starter-kit`

Bundle the most common plugins into a single import:

```ts
import { starterKit } from '@inkstream/starter-kit'

// Includes: bold, italic, underline, strike, code, heading, lists,
//           blockquote, codeBlock, image, history, linkBubble
```

With `exclude` option for customisation:
```ts
starterKit({ exclude: ['codeBlock', 'image'] })
```

This matches Tiptap's `StarterKit` and dramatically improves DX for new users.

---

### M4 — `@inkstream/toolbar` as standalone package

Extract `Toolbar.tsx` and the `ThemeToggle` component into a separate published package.

```
@inkstream/toolbar — Toolbar React component
  - All toolbar button rendering logic
  - Theme toggle
  - Dropdown menus
  - Color grid
```

**Benefit:** Consumers can use `@inkstream/editor-core` headlessly and build their own
toolbar, then swap in `@inkstream/toolbar` if they want the pre-built version.
This matches Tiptap's headless philosophy while still providing the batteries-included option.

---

### M5 — Per-plugin subpath exports

Enable tree-shaking at the plugin level:

```ts
// Current (imports all plugins regardless):
import { availablePlugins } from '@inkstream/editor-core'

// Target (only imports what you use):
import { boldPlugin } from '@inkstream/editor-core/bold'
import { italicPlugin } from '@inkstream/editor-core/italic'
```

**Impact:** Applications that don't use all 20 plugins ship less JS.

---

### M6 — `useEditor` headless hook

Expose a headless React hook that manages the `EditorView` lifecycle:

```ts
const { editor, editorView } = useEditor({
  plugins,
  initialContent,
  onChange,
})

// Use with your own toolbar
<div ref={editor.mount} />
<MyCustomToolbar editor={editor} />
```

This enables fully headless usage without `RichTextEditor` — closer to Tiptap's model
while still providing `RichTextEditor` for users who want everything pre-built.

---

## Long-Term — v1.0+

**Goal:** Ecosystem maturity, collaboration, and developer platform.

### L1 — Node.js / server-side utilities

```ts
import { generateHTML, generateText, generateJSON } from '@inkstream/html'

// Server-side rendering of editor content without loading ProseMirror UI
const html = generateHTML(proseMirrorJSON, extensions)
const text = generateText(proseMirrorJSON)
```

Needed for:
- Search indexing (extract plain text from stored JSON)
- Email previews, PDFs, social cards
- Server-side sanitization of editor output

### L2 — Collaboration (experimental)

ProseMirror has `prosemirror-collab` built in. A `@inkstream/collab` package that
integrates with CRDT backends (Yjs/HocusPocus):

```ts
import { collabPlugin } from '@inkstream/collab'

const plugins = [...starterKit, collabPlugin({ provider })]
```

### L3 — Plugin marketplace / registry

A public registry at `plugins.inkstream.dev` where developers can publish
their own `@inkstream/*` compatible plugins.

Plugin discovery in the editor:
```ts
import { searchReplacePlugin } from '@inkstream-community/search-replace'
```

### L4 — AI integration as first-class Pro feature

Move `aiAssistant` from `@inkstream/pro-plugins` to a dedicated `@inkstream/ai` package
with pluggable provider support:

```ts
import { aiPlugin } from '@inkstream/ai'
import { openAIProvider } from '@inkstream/ai/providers/openai'
import { claudeProvider } from '@inkstream/ai/providers/anthropic'

aiPlugin({ provider: openAIProvider({ apiKey: '...' }) })
```

### L5 — Framework adapters

```
@inkstream/vue        — Vue 3 composables
@inkstream/svelte     — Svelte stores
@inkstream/solid      — SolidJS signals
```

Core stays headless; framework packages provide their own reactive wrappers.

---

## Differentiators to Preserve

These are Inkstream's advantages over Tiptap — do not sacrifice them in the pursuit
of architectural purity:

| Feature | Why it matters |
|---|---|
| **Built-in CSS theming** | Tiptap ships zero CSS. Inkstream's token system saves hours of setup. |
| **Dark mode out of the box** | Developers expect this. Tiptap leaves it entirely to consumers. |
| **Built-in Toolbar** | Tiptap's headless model is powerful but high-friction. Inkstream ships ready to use. |
| **Freemium license tiers** | No competitor editor SDK has first-class monetization built in. |
| **`toolbarLayout` prop** | Declarative toolbar ordering is genuinely developer-friendly. |
| **Server-validated license** | Secure by default — tier is never inferred from the key string. |

---

## Version Plan

| Version | Theme | Key deliverables |
|---|---|---|
| **0.2.0** | Performance & correctness | @inkstream/pm, split useEffect, SSR guards, typed options |
| **0.2.x** | DX polish | Paste rules, addStorage, better error messages, more tests |
| **0.3.0** | Plugin maturity | Plugin-contributed schema, starter-kit, toolbar package |
| **0.3.x** | Ecosystem | Subpath exports, headless useEditor hook, node.js utilities |
| **0.4.0** | Collaboration alpha | @inkstream/collab (Yjs integration) |
| **1.0.0** | Stable API | Stable plugin API contract, semver guarantees, migration guide |

---

## References

- Tiptap source: https://github.com/ueberdosis/tiptap
- ProseMirror guide: https://prosemirror.net/docs/guide/
- Internal analysis notes: `.github/architecture-analysis.md`
