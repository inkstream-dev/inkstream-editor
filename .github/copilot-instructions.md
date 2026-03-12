# Inkstream — Copilot Instructions

## Commands

```bash
# All packages (via Turborepo)
pnpm build        # Build all packages in dependency order
pnpm dev          # Start all dev servers
pnpm lint         # Lint all packages

# editor-core only (has tests)
cd packages/editor-core
pnpm test                          # Run all Jest tests
pnpm test -- --testPathPattern=toggleBlockquote  # Run a single test file

# Demo app
cd apps/demo
pnpm dev          # Next.js dev server at http://localhost:3000
```

## Architecture

This is a **pnpm + Turborepo monorepo** for a ProseMirror-based rich text editor with a plugin system and freemium licensing model.

### Package dependency graph

```
apps/demo
  └── @inkstream/react-editor
        └── @inkstream/editor-core
              └── (ProseMirror packages)
  └── @inkstream/pro-plugins
        └── @inkstream/editor-core
  └── @inkstream/font-family, @inkstream/heading

packages/react-editor
  └── @inkstream/editor-core
  └── @inkstream/link-bubble

packages/link-bubble, packages/image, packages/pro-plugins
  └── @inkstream/editor-core
```

### Core concepts

**`PluginManager`** (`packages/editor-core/src/plugins/index.ts`) is the central registry. All plugins are registered into it before the schema is built. The schema is dynamic — `inkstreamSchema(manager)` creates a ProseMirror `Schema` from the nodes and marks contributed by registered plugins.

**`Plugin` interface** defines the contract for every plugin:
- `name` — unique string identifier
- `tier` — `'free' | 'pro' | 'premium'` (defaults to `'free'`)
- `nodes` / `marks` — ProseMirror node/mark specs to inject into the schema
- `getProseMirrorPlugins(schema)` — returns ProseMirror state plugins
- `getToolbarItems(schema, options?)` — returns toolbar button descriptors
- `getInputRules(schema)` — returns ProseMirror input rules
- `getKeymap(schema)` — returns keyboard shortcut map

**`LicenseManager`** (`packages/editor-core/src/license/`) validates keys with the format `INKSTREAM-{FREE|PRO|PREMIUM}-[A-Z0-9]+` and gates plugin availability by tier.

**`RichTextEditor`** (`packages/react-editor/src/index.tsx`) is the main React component. It accepts a `plugins` array, a `licenseKey`, an optional `toolbarLayout` (ordered array of plugin IDs; `'|'` inserts a separator), and `pluginOptions` (keyed by plugin name).

**`useLazyPlugins`** hook enables code-split loading of pro/premium plugins via dynamic `import()` — pro plugin code is only downloaded when the license tier permits it.

**`EditorWithTableDialog`** wraps `RichTextEditor` with a table-insertion dialog. It communicates with the editor via `window.__inkstreamEditorView__` (set on `EditorView` mount).

## Key Conventions

### Creating a plugin

Always use `createPlugin()` from `packages/editor-core/src/plugins/plugin-factory.ts`:

```ts
import { createPlugin } from './plugin-factory';

export const myPlugin = createPlugin({
  name: 'my-plugin',
  tier: 'free',          // omit to default to 'free'
  marks: { myMark: { ... } },
  getProseMirrorPlugins: (schema) => [...],
  getToolbarItems: (schema) => [{ id: 'my-plugin', icon: '…', tooltip: '…', command: … }],
  getInputRules: (schema) => [...],
  getKeymap: (schema) => ({ 'Mod-m': … }),
});
```

Then export the plugin instance from `packages/editor-core/src/plugins/index.ts` and add it to the `availablePlugins` map.

### Schema-first: always build schema from the manager

Never call `inkstreamSchema()` with an empty or separate `PluginManager` instance — the schema must be built from the same manager instance that has all plugins registered. In `react-editor`, this is handled inside `useMemo` via `pluginState`.

### Dual `.ts`/`.js` files in `editor-core/src`

Many files have both a `.ts` source and a compiled `.js` counterpart committed to the repo. Edit only the `.ts` file; the `.js` is output from `tsc`.

### ProseMirror version pinning

All ProseMirror packages are pinned via `pnpm.overrides` in the root `package.json` and hoisted via `.npmrc` (`public-hoist-pattern[]=*prosemirror*`). Do not change individual ProseMirror versions in package dependencies — update the root overrides instead.

### Test structure (`editor-core`)

Tests live alongside source files (`*.test.ts`). Use `ts-jest` with `testEnvironment: 'node'`. Tests import from the package's own `src/index.ts` using the `@inkstream/*` module alias (mapped in `jest.config.js`).

### Pro plugin distribution model (Phase 2)

`@inkstream/pro-plugins` is configured for **private registry distribution** (`publishConfig.access: "restricted"`). See `packages/pro-plugins/DISTRIBUTION.md` for the full customer setup guide.

**Two-layer protection:**
1. **Private registry** (Layer 1) — `@inkstream/pro-plugins` is not on public npm. Customers receive an npm token after purchase.
2. **Runtime guard** (Layer 2) — `guardPlugin()` in `src/pluginGuard.ts` wraps each plugin. Without a server-validated tier, all methods return empty stubs.

**Always use the factory — never bare plugin objects:**
```ts
import { createProPlugins } from '@inkstream/pro-plugins';
// grantedTier comes from useLicenseValidation() — server-validated
const { table, advancedExport, aiAssistant } = createProPlugins(grantedTier);
```

**`proPlugins` named export is deprecated** — it is permanently guarded with `'free'` tier (all no-ops). It exists only for backward compat.

**`PluginLoader` signature in `useLazyPlugins`** now receives `tier: LicenseTier` as its first argument so loaders can forward it to `createProPlugins`:
```ts
loader: (tier) => import('@inkstream/pro-plugins').then(m => ({ table: m.createProPlugins(tier).table }))
```


License tiers are validated server-side. The client-side key format check (`LicenseManager.isValidKeyFormat`) is for UX only and **never** grants feature access.

**Flow:**
1. User enters a key → `useLicenseValidation({ licenseKey, validationEndpoint })` calls `/api/validate-license`
2. Server returns `{ isValid, tier }` — this is the authoritative source
3. `validatedTier` flows into `RichTextEditor` (via `licenseValidationEndpoint` prop) and `useLazyPlugins` (via `validatedTier` prop)
4. Without `validationEndpoint`, tier is always `'free'` — the system is **secure by default**

**Key helpers on `LicenseManager`:**
- `static isValidKeyFormat(key)` — format check only (no security value)
- `static canTierAccess(userTier, requiredTier)` — pure tier comparison

**Validation endpoint** (demo): `apps/demo/src/app/api/validate-license/route.ts`  
In production: replace `VALID_LICENSE_KEYS` constant with a database/licensing service call.

**`useLazyPlugins` migration:** pass `validatedTier` (from `useLicenseValidation`), not `licenseKey`. The `licenseKey` option is deprecated and defaults tier to `'free'`.


All React components that use hooks or browser APIs carry the `"use client"` directive — this is a Next.js App Router requirement for the demo app.

### Toolbar layout

Pass an ordered array of plugin IDs to `toolbarLayout` prop to control button order. Use `'|'` as a separator token. Items not listed are excluded. If `toolbarLayout` is empty, all registered toolbar items appear in registration order.

### Git commit 
do not use Co-authored-by: Copilot in git commit messages for this project. The commit history should reflect only human authorship.