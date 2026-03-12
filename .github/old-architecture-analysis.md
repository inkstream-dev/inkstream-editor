# Inkstream Architecture Analysis
## Tiptap Benchmark Study — Internal Notes

> These are internal architectural observations based on a full code audit of both
> the Tiptap source (`/Users/yogesh/docker/tiptap`) and the Inkstream project.
> Use these notes when making design decisions.

---

## Tiptap Architecture — Key Observations

### Package Structure (60+ packages)

```
@tiptap/pm           — ProseMirror wrapper (all 15+ PM packages re-exported via subpaths)
@tiptap/core         — Headless editor, Extension/Node/Mark API, CommandManager
@tiptap/react        — useEditor, useEditorState, EditorContent, ReactRenderer
@tiptap/vue-3        — Vue composables (same core, different framework layer)
@tiptap/starter-kit  — Bundled extension kit (bold, italic, heading, lists, etc.)
@tiptap/extension-*  — 40+ individual extension packages
```

### The `@tiptap/pm` Wrapper Pattern

Tiptap wraps ALL ProseMirror packages in a single `@tiptap/pm` package with 15 subpath exports:

```ts
import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
```

**Why this matters:**
- Single version source of truth — `@tiptap/pm` is the only package with PM as a `dependency`
- All other packages (`core`, extensions) use `@tiptap/pm` as a `peerDependency`
- Eliminates the dual-instance problem at the architectural level
- Consumers never interact with `prosemirror-*` packages directly

### Extension API — Complete Lifecycle

Every extension has typed lifecycle hooks with `this` context:

```ts
const Bold = Mark.create({
  name: 'bold',
  addOptions() { return { HTMLAttributes: {} } },         // Typed config
  addStorage() { return { someState: null } },             // Per-extension state
  addCommands() { return { toggleBold: () => ... } },     // Chainable commands
  addKeyboardShortcuts() { return { 'Mod-b': ... } },
  addInputRules() { return [...] },
  addPasteRules() { return [...] },                        // No equivalent in Inkstream
  addProseMirrorPlugins() { return [...] },
  addGlobalAttributes() { return [...] },                  // No equivalent in Inkstream
  addExtensions() { return [...] },                        // Compose sub-extensions
  parseHTML() { return [...] },
  renderHTML({ HTMLAttributes }) { return <strong /> },   // JSX
  addNodeView() { return ReactNodeViewRenderer(Comp) },
  onCreate() {},
  onUpdate() {},
  onTransaction({ editor, transaction }) {},
  onBeforeCreate({ editor }) {},
})
```

**`.extend()` for inheritance:**
```ts
const CustomBold = Bold.extend({
  addKeyboardShortcuts() {
    return { ...this.parent?.(), 'Mod-Shift-b': () => this.editor.commands.toggleBold() }
  }
})
```

### React Integration — How Tiptap Does It

**`useEditor()`** — creates and manages the headless `Editor` instance:
- Uses `useSyncExternalStore` (React 18 concurrent-safe, SSR-safe)
- SSR protection: throws helpful error in dev, returns null in prod SSR
- Editor lifecycle fully managed inside `EditorInstanceManager` class
- Callbacks are captured by ref — no stale closure issues

**`useEditorState()`** — selective re-renders:
```ts
const isBold = useEditorState({
  editor,
  selector: s => s.editor?.isActive('bold') ?? false,
  equalityFn: (a, b) => a === b,
})
```
Only re-renders when the selected value changes (using `fast-equals` deep equality).
**This prevents toolbar button re-renders on every keystroke.**

**`EditorContent`** — separate React component mounts the editor DOM:
```tsx
<EditorContent editor={editor} />
```
The editor is headless — it only touches the DOM through `EditorContent`.

**`ReactNodeViewRenderer`** — custom node views as React components:
```ts
addNodeView() {
  return ReactNodeViewRenderer(MyImageComponent)
}
```
Uses React portals — the component renders into the editor DOM but is managed by React.

### Dependency Management — Tiptap's Rules

| Package type | ProseMirror declaration |
|---|---|
| `@tiptap/pm` | `dependencies` (owns PM) |
| `@tiptap/core` | `peerDependencies: { "@tiptap/pm": "..." }` |
| `@tiptap/react` | `peerDependencies: { "@tiptap/core", "@tiptap/pm" }` |
| Extension packages | `peerDependencies: { "@tiptap/core" }` |

**Result:** Consumer app gets ONE copy of ProseMirror. Fully deterministic.

### What Tiptap Does NOT Do

- **No built-in CSS/theming** — completely headless, styling is 100% consumer responsibility
- **No toolbar component** — consumer builds their own using `editor.isActive()`, `editor.commands`
- **No license/tier system** — Tiptap is MIT open source
- **No dark mode** — consumers handle this themselves

---

## Inkstream Architecture — Observations

### What Inkstream Does Differently (Good)

1. **Built-in CSS theming system** — 19 CSS custom properties, dark mode, 3 theme modes
2. **Built-in Toolbar component** — dramatically lowers barrier to entry vs Tiptap
3. **License/tier system** — freemium architecture is production-ready
4. **`toolbarLayout` prop** — declarative toolbar ordering via array of IDs
5. **`showThemeToggle` prop** — zero-config theme switching
6. **CSS token overrides** — per-instance branding via `.wrapper { --ink-accent: #7c3aed }`

### Architectural Gaps vs Tiptap

#### 🔴 Critical

1. **~~No `@inkstream/pm` wrapper~~ ✅ IMPLEMENTED (v0.1.0)**
   - ~~Each package imports from `prosemirror-*` bare specifiers directly~~
   - ~~pnpm overrides + content-addressed store currently prevent dual instances~~
   - ~~But this is fragile — any consumer on npm without the overrides can get duplicates~~
   - **Implemented:** `packages/pm/` created with 10 subpath exports (`@inkstream/pm/model`, `@inkstream/pm/state`, etc.)
   - All internal packages now declare `@inkstream/pm` as peerDependency; prosemirror-* removed from all other packages
   - `@inkstream/pm` is the sole package that has prosemirror-* as `dependencies`
   - Root pnpm overrides kept as belt-and-suspenders for version pinning
   - `typesVersions` added for TypeScript `moduleResolution: node` compatibility

2. **Schema has hardcoded nodes**
   - `paragraph`, `heading`, `blockquote`, `codeBlock`, `image`, `text`, `hard_break`
     are all hardcoded in `schema.ts`, not plugin-contributed
   - Consumers can't override heading behaviour — they can't remove it or change it
   - **Fix:** Make all nodes plugin-contributed; `schema.ts` should only define `doc` and `text`

3. **Entire editor rebuilds when any dep changes**
   - `useEffect` in `RichTextEditor` has `[schema, proseMirrorPlugins, pluginManager, ...]`
   - Adding an item to `toolbarLayout` destroys and recreates the editor
   - **Fix:** Separate "create editor" effect from "update toolbar items" effect

4. **No `useEditorState` equivalent**
   - Every transaction triggers `setCurrentEditorState(newState)` → full Toolbar re-render
   - With 20 toolbar buttons each calling `isActive()`, this is expensive
   - **Fix:** Each toolbar button should subscribe independently; or use `useSyncExternalStore`

#### 🟡 Important

5. ~~**No `addOptions()` typed config per plugin**~~  ✅ **Resolved (S5)**
   - ~~Plugin options are passed via `pluginOptions` as a global untyped Record~~
   - ~~No TypeScript type safety per plugin~~
   - `createPlugin<TOptions>()` now accepts a generic type parameter
   - `addOptions()` defines defaults; `this.options` inside methods is typed as `TOptions`
   - `PluginManager.getToolbarItems` merges defaults with user overrides
   - `textColor` and `highlight` updated with `TextColorOptions` / `HighlightOptions`
   - `pluginOptions` prop tightened from `{[key:string]:any}` → `{[key:string]:Record<string,unknown>}`

6. **No paste rules**
   - Tiptap supports `addPasteRules()` for auto-formatting pasted content
   - Missing from Inkstream plugin contract

7. **No `addStorage()` per plugin**
   - Plugins have no place to store state across transactions
   - Needed for things like "last used color", "current link href", etc.

8. **No `addGlobalAttributes()`**
   - Can't add `data-*` attributes to nodes from a different extension

9. **No SSR safety**
   - `new window.DOMParser()` called during render without SSR guard
   - Editor initialization in `useEffect` is client-only but no explicit guard

10. **`onEditorReady` callback + `window.__inkstreamEditorView__`**
    - Exposing the EditorView on `window` is a code smell
    - `EditorWithTableDialog` uses this global instead of proper ref forwarding

#### 🟢 Minor

11. **`heading` and `link-bubble` as separate packages**
    - Heading is arguably a core feature — should be in `editor-core` or `starter-kit`
    - Currently creates friction (extra install for basic use)

12. **`availablePlugins` as object map**
    - All 20 plugins are always imported by consumers even if not used
    - Tree-shaking doesn't help because they're in a single exported object
    - **Fix:** Allow per-plugin imports: `import { boldPlugin } from '@inkstream/editor-core/bold'`

13. **CSS class naming**
    - Mixed: `inkstream-editor-wrapper`, `inkstream-toolbar-button`, `ProseMirror`
    - `ProseMirror` class comes from the ProseMirror library itself — can't be namespaced
    - Should document which classes are stable API vs internal implementation

---

## Key Decisions for Roadmap

| Decision | Tiptap approach | Inkstream current | Recommended |
|---|---|---|---|
| ProseMirror ownership | `@tiptap/pm` wrapper | ~~Direct deps in each package~~ **`@inkstream/pm` ✅** | ~~Create `@inkstream/pm`~~ Done |
| CSS/Theming | None (headless) | Full token system | Keep — this is a differentiator |
| Toolbar | None (consumer builds) | Built-in | Keep — but extract to `@inkstream/toolbar` |
| Schema | Plugin-contributed | Partially hardcoded | Move all nodes to plugins |
| React hook | useSyncExternalStore | useState + useEffect | Migrate to useSyncExternalStore |
| Extension config | Typed `addOptions()` | ~~Untyped `pluginOptions`~~ **`createPlugin<TOptions>()` ✅** | ~~Add typed options to Plugin interface~~ Done |
| Commands | Chainable command API | Direct ProseMirror commands | Keep current (simpler) |
| SSR | Full support | None | Add basic SSR guards |
