# Inkstream Editor — Strategic Roadmap

> A roadmap for evolving Inkstream into a commercially viable, technically excellent
> editor SDK for React. Informed by a benchmark study of Tiptap's architecture and a
> full audit of the current Inkstream codebase (March 2026).

---

## Vision

Inkstream is a **batteries-included, freemium-ready** ProseMirror editor SDK for React.
Where Tiptap is fully headless (no UI, no theming, no toolbar), Inkstream ships with a
polished out-of-the-box experience while remaining deeply customisable.

**Target developers:** Teams who want a rich text editor running in under 30 minutes,
with room to grow — custom plugins, theming, tier-gated Pro features, and eventually
an extension marketplace.

---

## Current State (v0.1.x)

### Strengths
- **CSS variable theming** — 19+ design tokens, auto/light/dark modes, scoped to `.inkstream-editor-wrapper`
- **Built-in Toolbar** — declarative `toolbarLayout` array, separator tokens, `iconHtml` SVG buttons
- **Server-validated licensing** — tier system (`free | pro | premium`) validated via API, secure by default
- **`createPlugin<TOptions>`** — type-safe plugin factory with generic options and `this.options` context
- **`@inkstream/pm` wrapper** — mirrors Tiptap's `@tiptap/pm` pattern; 9 subpath exports
- **`useLazyPlugins`** — code-split pro plugin loading gated on server-validated tier
- **`EditorStateStore`** — pub/sub pattern for efficient toolbar re-renders without React overhead
- **ProseMirror version pinning** — monorepo-wide `pnpm.overrides` + hoist pattern
- **tsup dual output** — ESM + CJS + `.d.ts` for every package
- **23 built-in plugins** — full coverage of common rich-text needs

### Key Gaps (priority ordered)

| # | Gap | Impact |
|---|-----|--------|
| 1 | No plugin lifecycle hooks (`onCreate`, `onUpdate`, `onDestroy`) | Plugins can't react to editor events |
| 2 | Core marks defined in `schema.ts`, not in plugin packages | Design inconsistency; bold plugin doesn't own the `strong` mark |
| 3 | No chainable commands API | Raw ProseMirror commands leak to consumers |
| 4 | No paste rules support in `createPlugin` | Paste-time auto-formatting impossible |
| 5 | No plugin storage (`addStorage`) | Plugins can't maintain reactive state |
| 6 | `window.__inkstreamEditorView__` global for table dialog | Anti-pattern; should use ref/callback |
| 7 | Compiled `.js` files committed alongside `.ts` in `editor-core` | Dirty VCS history; confusing for contributors |
| 8 | No `Extension.extend()` inheritance | Can't create variants of existing plugins |
| 9 | No `addGlobalAttributes()` | Can't inject attributes cross-plugin |
| 10 | No node view API in `createPlugin` | Custom node rendering is a one-off in react-editor |
| 11 | No SSR-safe editor creation | `immediatelyRender` equivalent missing |
| 12 | No changeset-based versioning | Manual version bumps, no auto-changelogs |

---

## Short-Term Goals (v0.2.x)

These are focused, low-risk improvements that clean up existing pain points and close the
most impactful gaps with minimal breaking changes.

### 1. Move mark/node specs into plugin packages

Right now, marks like `strong`, `em`, and `underline` are defined in `schema.ts` but their
behaviour (keymap, toolbar, input rules) lives in `packages/bold`, `packages/italic`, etc.
Each plugin package should own its full schema contribution:

```ts
// packages/bold/src/index.ts
export const boldPlugin = createPlugin({
  name: 'bold',
  marks: {
    strong: {
      parseDOM: [{ tag: 'strong' }, { tag: 'b' }, { style: 'font-weight=bold' }],
      toDOM() { return ['strong', 0]; },
    },
  },
  getKeymap: (schema) => ({ 'Mod-b': toggleMark(schema.marks.strong) }),
  // ...
});
```

`schema.ts` should only define the non-negotiable structural nodes (`doc`, `text`).

### 2. Add lifecycle hooks to `createPlugin`

Introduce `onCreate`, `onUpdate`, `onDestroy`, `onFocus`, `onBlur` hooks in the plugin
config, forwarded from the React editor lifecycle:

```ts
createPlugin({
  name: 'word-count',
  onUpdate({ state }) {
    // Recalculate word count when document changes
  },
  onDestroy() {
    // Cleanup subscriptions
  },
});
```

### 3. Add `getStorage` and `addPasteRules` to `createPlugin`

```ts
createPlugin({
  name: 'my-plugin',
  addStorage: () => ({ count: 0 }),            // Initial state
  getPasteRules: (schema) => [/* ... */],       // Paste-time patterns
});
```

### 4. Remove committed build artifacts from `editor-core`

Delete the `.js`/`.d.ts` files committed alongside source `.ts` files in
`packages/editor-core/src/`. The build step (`tsup`) produces these in `dist/`. Having
them in `src/` creates confusion for contributors and dirty `git diff` noise.

### 5. Fix `window.__inkstreamEditorView__` anti-pattern

Replace the module-level `tableDialogBridge` global with a proper `EditorRef` or
callback prop pattern on `EditorWithTableDialog`:

```tsx
<EditorWithTableDialog
  ref={editorRef}
  onEditorReady={(view) => { /* store view safely */ }}
/>
```

### 6. Add `@changesets/cli` for versioning and changelogs

Adopt the same changeset workflow used by Tiptap, Radix, and most pnpm monorepos. This
enables atomic version bumps with auto-generated `CHANGELOG.md` per package.

---

## Medium-Term Goals (v0.3.x – v0.5.x)

These introduce more significant architectural enhancements that bring Inkstream's plugin
system closer to Tiptap's maturity and DX.

### 1. Chainable Commands API

Introduce a `CommandManager` that wraps ProseMirror transactions into a chainable,
type-safe interface:

```ts
editor.chain()
  .toggleBold()
  .setTextAlign('center')
  .focus()
  .run();

// Dry-run check
const canToggle = editor.can().toggleBold();
```

All plugin-contributed commands should be accessible via this unified API.

### 2. `Extension.extend()` Inheritance Pattern

Allow plugins to be extended rather than forked:

```ts
import { boldPlugin } from '@inkstream/bold';

const CustomBoldPlugin = boldPlugin.extend({
  name: 'custom-bold',
  getKeymap: (schema) => ({
    'Mod-b': toggleMark(schema.marks.strong),
    'Ctrl-b': toggleMark(schema.marks.strong),   // Add additional shortcut
  }),
});
```

### 3. `addGlobalAttributes()` Support

Allow plugins to inject attributes onto existing nodes/marks:

```ts
createPlugin({
  name: 'analytics',
  addGlobalAttributes: () => [{
    types: ['paragraph', 'heading'],
    attributes: {
      'data-analytics-id': {
        default: null,
        parseDOM: element => element.getAttribute('data-analytics-id'),
        renderDOM: attrs => ({ 'data-analytics-id': attrs['data-analytics-id'] }),
      },
    },
  }],
});
```

### 4. `addNodeView()` in `createPlugin`

Move React node view rendering into the plugin definition, removing the one-off
`ImageNodeView.tsx` from react-editor:

```ts
createPlugin({
  name: 'image',
  nodes: { image: { /* ... */ } },
  addNodeView: () => ReactNodeViewRenderer(ImageComponent),
});
```

### 5. SSR-Safe Editor Initialisation

Add an `immediatelyRender` option (or equivalent) to `RichTextEditor` for safe use in
Next.js App Router / SSR environments without hydration mismatches:

```tsx
<RichTextEditor immediatelyRender={false} /* ... */ />
```

### 6. Performance: Selective Toolbar Re-renders

Leverage `useSyncExternalStore` (React 18) in `Toolbar.tsx` to replace the current
`EditorStateStore` with React's built-in concurrent-safe subscription primitive.

---

## Long-Term Vision (v1.0+)

These are strategic, ecosystem-level goals for making Inkstream a competitive and
sustainable open-source project.

### 1. Framework-Agnostic Core

Extract all editor logic into a headless `@inkstream/editor-core` that has zero React
dependency. The React layer becomes a thin integration package (like `@tiptap/react`
vs `@tiptap/core`). This enables:

- `@inkstream/vue` — Vue 3 composables
- `@inkstream/svelte` — Svelte stores integration
- `@inkstream/vanilla` — Plain JS usage

### 2. Collaborative Editing Extension

A first-class collaboration plugin backed by a CRDT library (e.g., Yjs):

```ts
import { collaborationPlugin } from '@inkstream/collaboration';
import { WebrtcProvider } from 'y-webrtc';

// Plug-and-play real-time collaboration
plugins: [
  ...corePlugins,
  collaborationPlugin({ provider: new WebrtcProvider('room', doc) }),
]
```

### 3. Markdown Input/Output

A dedicated `@inkstream/markdown` package providing bidirectional Markdown ↔ ProseMirror
serialisation, enabling Markdown-first workflows:

```ts
editor.commands.setContent(markdownToDoc('**Hello** world'));
editor.commands.getMarkdown(); // Returns Markdown string
```

### 4. Extension Marketplace

A curated registry of Inkstream-compatible plugins (both official and community):

```bash
npx inkstream add @community/mention
npx inkstream add @community/emoji-picker
```

With tier-aware installation (pro/premium plugins require license token).

### 5. Visual Schema & Toolbar Builder

A drag-and-drop UI for composing toolbar layouts and plugin configurations, outputting
a `toolbarLayout` array and `pluginOptions` object ready to paste into your app.

### 6. Monolithic Versioning

Move to a single `version` field across all packages (like Tiptap's v3.x approach).
This eliminates version mismatch bugs and simplifies upgrade messaging for consumers.

---

## Differentiation from Tiptap

Tiptap is excellent but fully headless. Inkstream's competitive angle:

| Feature | Tiptap | Inkstream |
|---------|--------|-----------|
| Built-in toolbar UI | ❌ Headless | ✅ Included |
| Built-in dark mode theming | ❌ | ✅ CSS variable system |
| Freemium license tiers | ❌ MIT | ✅ free / pro / premium |
| Server-validated licensing | ❌ | ✅ Secure by default |
| Lazy-loaded pro plugins | ❌ | ✅ Code-split distribution |
| Private registry pro packages | ❌ | ✅ GitHub Packages |
| `toolbarLayout` customisation | ❌ | ✅ Array-based ordering |

Inkstream fills the niche between "bring your own everything" (Tiptap) and "no-code
editor builders" (Notion-like products). It is the **React editor SDK for product teams
that want a great default experience but full control when they need it**.

---

## Appendix: Package Structure Target (v1.0)

```
@inkstream/pm              — ProseMirror re-export layer (already done ✅)
@inkstream/editor-core     — Headless editor engine, plugin system, license
@inkstream/react           — React hooks + components (renamed from react-editor)
@inkstream/vue             — Vue 3 integration (new)
@inkstream/starter-kit     — Bundled default plugin set (already done ✅)

@inkstream/bold            — Bold mark + schema + toolbar (schema ownership fixed)
@inkstream/italic          — Italic mark + schema + toolbar
@inkstream/underline       — Underline mark + schema + toolbar
... (all 23 current plugins, each owning their schema)

@inkstream/collaboration   — Yjs-based real-time collaboration (new)
@inkstream/markdown        — Markdown serialisation (new)
@inkstream/table           — Table extension (promoted from pro, or separate package)

@inkstream-dev/pro-plugins — Private: advanced export, AI assistant, etc.
```
