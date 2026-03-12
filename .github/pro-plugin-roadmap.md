# Inkstream Pro Plugins — Gap Analysis & Roadmap

> Audit date: 2026-03-12  
> Audit base: `@inkstream-dev/pro-plugins` v0.1.1 vs Inkstream core commits up to `8a4ddd5`

---

## 1. Current Architecture Overview

### Repository structure

The pro-plugins repository is a **single flat package** (`@inkstream-dev/pro-plugins`) containing three plugins and a support library:

```
src/
├── index.ts               — factory + deprecated export
├── pluginGuard.ts         — tier guard wrapper
├── advanced-export.ts     — Markdown export plugin (PRO)
├── ai-assistant.ts        — AI writing assistant (PREMIUM, stubs)
├── markdown/
│   ├── types.ts           — ExportOptions, SerializeContext
│   └── serializer.ts      — ProseMirror-to-Markdown serializer (547 lines)
└── table/
    ├── index.ts           — re-exports
    ├── table-plugin.ts    — main createPlugin call
    ├── table-schema.ts    — table node definitions + CSS
    ├── table-commands.ts  — PM commands (insertTable, row/col ops, merge, …)
    ├── table-toolbar.ts   — toolbar items
    └── __tests__/
        └── table.test.ts  — 784-line test suite
```

### Build pipeline

| Item | Current | Main repo standard |
|---|---|---|
| Compiler | `tsc` (CommonJS only) | `tsup` (ESM + CJS dual output) |
| Output | `dist/*.js` + `dist/*.d.ts` | `dist/index.{js,mjs,d.ts,d.mts}` |
| Dev watch | `tsc --watch` | `tsup --watch` |
| Test runner | Jest + ts-jest | Jest + ts-jest |

### Distribution

Private registry via GitHub Packages (`@inkstream-dev/` scope).  
Defense-in-depth:  
- Layer 1: private registry (authentication required)  
- Layer 2: `guardPlugin()` runtime tier check (server-validated tier only)

---

## 2. Alignment with Inkstream Core

### ✅ Aligned

| Area | Detail |
|---|---|
| Plugin factory | All three plugins use `createPlugin()` from `@inkstream/editor-core` |
| Tier system | `guardPlugin` + `createProPlugins(grantedTier)` correctly implements server-validated tiers |
| Schema contribution | `tablePlugin` contributes `table`, `table_row`, `table_cell`, `table_header` via `nodes:` |
| TypeScript strict | `strict: true`, all sources `.ts`, no committed `.js` artifacts |
| SSR guard | `injectTableStyles()` checks `typeof document === 'undefined'` |
| Test coverage | Table plugin has 784-line test suite covering commands, schema, and toolbar |
| Deprecated compat | Old `proPlugins` export preserved as all-disabled stubs |

### ❌ Not Aligned

| Area | Gap | Severity |
|---|---|---|
| `tableDialogBridge` import | **Deleted from editor-core** in commit `8a4ddd5`; pro-plugins still imports + mutates it | **CRITICAL — breaks integration** |
| Direct `prosemirror-*` imports | All files import `prosemirror-model`, `prosemirror-state`, etc. directly instead of `@inkstream/pm` wrappers | High |
| `addOptions()` | No plugin declares typed options; options passed ad-hoc to `getToolbarItems` | Medium |
| `addStorage()` | No plugin uses `this.storage` for mutable per-instance state | Medium |
| Lifecycle hooks | `onCreate`, `onUpdate`, `onDestroy`, `onFocus`, `onBlur` unused across all plugins | Medium |
| `getKeymap()` | Table keyboard shortcuts embedded inside `getProseMirrorPlugins()` instead of `getKeymap()` | Medium |
| `getPasteRules()` | Unused; table paste behaviour relies on ProseMirror defaults | Low |
| `pluginGuard` stub | Stub object missing `getPasteRules`, `storage`, and lifecycle hook fields from the current `Plugin` interface | Medium |
| Build tooling | `tsc` produces CJS-only output; no ESM build, no source maps | Medium |
| Package name | `@inkstream-dev/pro-plugins` vs main repo's `@inkstream/` scope convention | Low |
| `peerDependencies` | References bare `prosemirror-*` packages; consumers who use `@inkstream/pm` have two ProseMirror instances | High |

---

## 3. Identified Gaps (Detailed)

### GAP-01 — `tableDialogBridge` deleted (CRITICAL)

**Current state:**  
`table-plugin.ts` and `table-toolbar.ts` import `tableDialogBridge` from `@inkstream/editor-core` and mutate it at module-load time:

```ts
// table-plugin.ts (line ~20)
tableDialogBridge.applyCellStyling = (attrs) => { ... };
tableDialogBridge.runToggleHeaderRow = () => { ... };
tableDialogBridge.runDeleteTable = () => { ... };
tableDialogBridge.insertTable = insertTable;

// table-toolbar.ts — reads bridge to open dialogs from keyboard shortcut
tableDialogBridge.openPropertiesDialog?.();
```

**Desired state:**  
`tableDialogBridge` was deleted in the core refactor (goal #5). The table plugin must receive its callbacks via `this.options` (passed by `EditorWithTableDialog` through `pluginOptions.table`). Exported types `TableCommands` and `TablePluginOptions` are now available from `@inkstream/react-editor` for this wiring.

**Required change:**  
```ts
// table-plugin.ts — new pattern
createPlugin<TablePluginOptions>({
  name: 'table',
  addOptions: () => ({
    openInsertDialog: undefined,
    openPropertiesDialog: undefined,
    onCommandsReady: undefined,
  }),
  onCreate({ view }) {
    // Register commands with EditorWithTableDialog
    this.options.onCommandsReady?.({
      insertTable,
      applyCellStyling: (attrs) => { ... },
      runToggleHeaderRow: () => { ... },
      runDeleteTable: () => { ... },
    });
  },
  getKeymap(schema) {
    return {
      'Mod-Shift-t': () => {
        this.options.openPropertiesDialog?.();
        return true;
      },
    };
  },
  // toolbar button for "Insert Table" calls: this.options.openInsertDialog?.()
});
```

---

### GAP-02 — Direct `prosemirror-*` imports

**Current state:**  
Every source file imports directly:
```ts
import { Schema, Node } from 'prosemirror-model';
import { EditorState, Transaction, Plugin } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
```

**Risk:**  
The main Inkstream project pins ProseMirror versions via `pnpm.overrides` and uses `@inkstream/pm/*` wrappers to guarantee a single instance. Pro-plugins bypass these guarantees, risking two incompatible ProseMirror instances when the table plugin's `Node` class is not `===` to the core's `Node` class — causing subtle schema and dispatch bugs.

**Desired state:**  
Import from `@inkstream/pm` wrappers:
```ts
import { Schema, Node } from '@inkstream/pm/model';
import { EditorState, Transaction, Plugin } from '@inkstream/pm/state';
import { keymap } from '@inkstream/pm/keymap';
```

`prosemirror-tables` has no `@inkstream/pm` wrapper yet — see GAP-06.

---

### GAP-03 — `addOptions()` not used

**Current state:**  
`advancedExportPlugin` reads options through the `getToolbarItems` second parameter (`options?: Record<string, unknown>`):
```ts
getToolbarItems: (schema, options) => {
  const exportOptions = { ...defaults, ...(options?.exportOptions as ExportOptions) };
}
```

**Risk:**  
- No type safety on option names or values
- `this.options` is unavailable in `getProseMirrorPlugins`, keymaps, lifecycle hooks

**Desired state:**  
```ts
createPlugin<ExportOptions>({
  name: 'advancedExport',
  addOptions: () => ({ flavor: 'gfm', preserveUnsupportedAsHTML: false }),
  getToolbarItems(schema) {
    const { flavor, preserveUnsupportedAsHTML } = this.options; // typed
    return [{ command: () => { downloadMarkdown(state.doc, this.options); return true; } }];
  },
});
```

---

### GAP-04 — `addStorage()` not used

**Current state:**  
AI Assistant plugin stubs state into closures or hardcodes it.

**Desired state:**  
AI plugin should store conversation context, loading state, and cached suggestions in `this.storage`:
```ts
createPlugin<AIOptions, AIStorage>({
  addStorage: () => ({ isLoading: false, lastPrompt: '', suggestions: [] }),
  onUpdate({ state }) {
    if (this.storage.isLoading) { /* update loading indicator */ }
  },
});
```

---

### GAP-05 — Table keymaps embedded in `getProseMirrorPlugins`

**Current state:**  
```ts
getProseMirrorPlugins: (schema) => {
  return [
    tableEditing(), columnResizing(), ...,
    keymap({ Tab: ..., 'Shift-Tab': ..., 'Mod-Shift-t': ... })  // ← mixed in here
  ];
}
```

**Problem:**  
- Keymaps buried inside PM plugins can't be overridden by consumers via `toolbarLayout` or `pluginOptions`
- `Mod-Shift-t` handler reads `tableDialogBridge` (gap #01)
- `getKeymap()` exists precisely for this separation

**Desired state:**  
Extract to `getKeymap()` so the `PluginManager` collects it separately:
```ts
getKeymap(schema) {
  return {
    Tab: ..., 'Shift-Tab': ..., ArrowDown: ..., 'Mod-Enter': ...,
    'Mod-Shift-t': () => { this.options.openPropertiesDialog?.(); return true; },
  };
},
```

---

### GAP-06 — `peerDependencies` include raw ProseMirror packages

**Current state:**  
```json
"peerDependencies": {
  "prosemirror-model": "^1.19.0",
  "prosemirror-state": "^1.4.0",
  "prosemirror-view": "^1.32.2",
  "prosemirror-keymap": "^1.2.0",
  "prosemirror-commands": "^1.5.2"
}
```

**Problem:**  
Consumers who already have `@inkstream/pm` wrappers now have two separate ProseMirror installs. The `@inkstream/pm` wrappers are the canonical re-exports.

**Desired state:**  
```json
"peerDependencies": {
  "@inkstream/editor-core": ">=0.1.5",
  "@inkstream/pm": ">=0.1.0"
}
```

A `@inkstream/pm/tables` wrapper for `prosemirror-tables` should be added to the main monorepo.

---

### GAP-07 — `pluginGuard` stub is incomplete

**Current state:**  
The no-op stub returned when tier is insufficient is missing fields added to the `Plugin` interface:
```ts
return {
  name, tier, description,
  getProseMirrorPlugins: () => [],
  getToolbarItems: () => [],
  getInputRules: () => [],
  getKeymap: () => ({}),
  // MISSING: getPasteRules, storage, onCreate, onUpdate, onDestroy, onFocus, onBlur
};
```

**Desired state:**  
```ts
return {
  name, tier, description,
  storage: {},
  getProseMirrorPlugins: () => [],
  getToolbarItems: () => [],
  getInputRules: () => [],
  getKeymap: () => ({}),
  getPasteRules: () => [],
  // lifecycle hooks intentionally absent (undefined = no-op, correct)
};
```

---

### GAP-08 — Build produces CJS-only, no ESM

**Current state:**  
`tsconfig.json` sets `"module": "commonjs"` — single `dist/index.js` output, no ESM bundle.

**Problem:**  
Next.js App Router (`"use client"` components), Vite projects, and modern bundlers prefer or require ESM. CJS-only packages cause tree-shaking failures and may trigger RSC bundler warnings.

**Desired state:**  
Migrate to `tsup` (same as all main packages):
```ts
// tsup.config.ts
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
});
```

---

## 4. Required Architectural Adjustments

Priority order for maintaining integration compatibility:

| # | Gap | Priority | Breaking if unaddressed? |
|---|---|---|---|
| 1 | GAP-01: Replace `tableDialogBridge` | **P0 — ASAP** | Yes — table plugin is non-functional in current core |
| 2 | GAP-07: Complete `pluginGuard` stub | **P0** | Partial — stubs may throw on new API calls |
| 3 | GAP-02: Switch to `@inkstream/pm` wrappers | **P1** | Potential dual-instance bugs |
| 4 | GAP-06: Fix `peerDependencies` | **P1** | Dependency conflicts |
| 5 | GAP-03: `addOptions()` for typed plugin config | **P2** | No — degraded DX |
| 6 | GAP-05: Extract keymaps to `getKeymap()` | **P2** | No |
| 7 | GAP-04: `addStorage()` for plugin state | **P2** | No |
| 8 | GAP-08: Add ESM build via tsup | **P3** | No — CJS still works |

---

## 5. Short-Term Improvements

### 5.1 Fix `tableDialogBridge` → `this.options` pattern (P0)

Replace module-load mutations with `addOptions` + `onCreate` lifecycle hook. The `TablePluginOptions` type is exported from `@inkstream/react-editor` and defines the exact shape:

```ts
import { TablePluginOptions, TableCommands } from '@inkstream/react-editor';

export const tablePlugin = createPlugin<TablePluginOptions>({
  name: 'table',
  tier: 'pro',
  addOptions: () => ({
    openInsertDialog: undefined,
    openPropertiesDialog: undefined,
    onCommandsReady: undefined,
  }),
  onCreate({ view }) {
    this.options.onCommandsReady?.({
      insertTable,
      applyCellStyling: (attrs) => {
        Object.entries(attrs).forEach(([k, v]) => setCellAttr(k, v as any)(view.state, view.dispatch));
      },
      runToggleHeaderRow: () => toggleHeaderRow(view.state, view.dispatch),
      runDeleteTable: () => deleteTable(view.state, view.dispatch),
    });
  },
  getKeymap(schema) {
    return {
      Tab: ..., 'Shift-Tab': ..., ArrowDown: ..., 'Mod-Enter': ...,
      'Mod-Shift-t': () => { this.options.openPropertiesDialog?.(); return true; },
    };
  },
  // ... rest unchanged
});
```

### 5.2 Complete `pluginGuard` stub (P0)

Add all fields present on the `Plugin` interface:
```ts
return {
  name: plugin.name,
  tier: plugin.tier,
  description: plugin.description,
  storage: {},
  getProseMirrorPlugins: () => [],
  getToolbarItems: () => [],
  getInputRules: () => [],
  getKeymap: () => ({}),
  getPasteRules: () => [],
};
```

### 5.3 Add typed options to `advancedExportPlugin`

Use `addOptions<ExportOptions>()` so consumers get autocomplete on `pluginOptions.advancedExport`.

### 5.4 Tighten test coverage for `advancedExportPlugin` and `aiAssistantPlugin`

Both currently have zero unit tests. At minimum: verify toolbar item is returned, command does not throw.

---

## 6. Medium-Term Improvements

### 6.1 Migrate to `@inkstream/pm` wrappers

1. Add `@inkstream/pm/tables` wrapper package in the main monorepo (re-exports `prosemirror-tables`)
2. Update all pro-plugin imports to use `@inkstream/pm/*`
3. Change `peerDependencies` to `@inkstream/pm` and `@inkstream/editor-core`

### 6.2 Migrate build to `tsup` (ESM + CJS)

Replace `tsconfig.json`-driven `tsc` build with a `tsup.config.ts`. Enables:
- ESM output for modern bundlers
- Source maps for debugging
- Consistent with the main monorepo's build pipeline

### 6.3 Use `addStorage()` for AI Assistant session state

Store conversation history, loading state, and pending requests in `this.storage` so they survive across toolbar re-renders and are cleaned up in `onDestroy`.

### 6.4 AI Assistant real implementation

Replace stub `TODO` commands with actual AI API integration:
- `onCommandsReady` / `addOptions` for API endpoint + model configuration
- `addStorage` for request state, abort controllers, history
- `onCreate`/`onDestroy` lifecycle hooks for subscription cleanup

### 6.5 Add paste rules for table import

Implement `getPasteRules()` on `tablePlugin` to handle:
- Pasting tab-separated values → auto-convert to a table
- Pasting HTML tables from external sources → normalise attrs

### 6.6 Structured package split (optional)

When the plugin count grows, consider splitting into separate packages following the main monorepo pattern:

```
packages/
  @inkstream/pro-table/
  @inkstream/pro-export/
  @inkstream/pro-ai/
```

Enables per-plugin versioning and tree-shaking.

---

## 7. Long-Term Evolution

### 7.1 Unified `@inkstream/pm` wrapper for all ProseMirror sub-packages

Add `@inkstream/pm/tables`, `@inkstream/pm/markdown`, and other domain-specific wrappers so every Inkstream package (core, pro, community) uses the same versioned ProseMirror entry points.

### 7.2 Plugin marketplace / registry

As the plugin count grows, introduce:
- A `@inkstream/plugin-registry` listing community + official + pro plugins
- A standard `PluginManifest` type (name, version, tier, description, iconUrl)
- The `PluginManager` can optionally validate plugin manifests at registration

### 7.3 First-class `addStorage` patterns for pro features

Pro plugins need persistent state more than free ones (AI history, export preferences, table layout memory). Define canonical storage shapes:
- `AIChatStorage` — history, pendingRequest, abortController
- `ExportStorage` — lastExportedAt, lastOptions
- `TableStorage` — lastInsertConfig (rows/cols/header), cellAttributeCache

### 7.4 AI Plugin production implementation

When an AI backend is available:
- `addOptions` for `{ apiEndpoint, model, maxTokens, systemPrompt }`
- `onCreate`/`onDestroy` for stream lifecycle
- `onUpdate` to track selection changes for context-aware suggestions
- React component integration via `pluginOptions.aiAssistant.renderSuggestionPanel`

### 7.5 PDF / Word export

`advancedExportPlugin` description mentions PDF and Word export — not yet implemented. Architecture path:
- PDF: headless Chromium rendering or `pdfmake` (browser-based)
- Word: `docx` npm package for `.docx` generation
- Use `addOptions` for format selection; `addStorage` for progress state

---

## Summary

| Horizon | Key Items |
|---|---|
| **Immediate (P0)** | Fix `tableDialogBridge` removal, complete `guardPlugin` stub |
| **Short-term** | Typed options for all plugins, test coverage for export/AI plugins |
| **Medium-term** | `@inkstream/pm` wrapper adoption, `tsup` migration, `addStorage` for AI plugin |
| **Long-term** | Plugin marketplace, AI implementation, PDF/Word export, package split |
