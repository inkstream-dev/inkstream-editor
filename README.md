# Inkstream

A developer-focused, extensible WYSIWYG rich text editor SDK built on **ProseMirror** with a modular plugin system, React wrapper, and a freemium licensing model — designed to be embedded in any React or Next.js application.

---

## ✨ Features

- **Modular plugin system** — every formatting capability is a first-class plugin; register only what you need
- **Freemium licensing** — server-validated tiers (`free` / `pro` / `premium`) gate plugin availability at runtime
- **Pro plugin distribution** — Pro/Premium plugins shipped as a private npm package (`@inkstream-dev/pro-plugins`) separate from the open-source core
- **Lazy loading** — Pro/Premium plugin code is only downloaded after the license tier is server-confirmed
- **Content API** — `onChange` prop for live HTML updates; `ref.getContent()` / `ref.focus()` for imperative access
- **Rich built-in plugins** — bold, italic, underline, strikethrough, lists, blockquote, code blocks, images, text colour, highlight, horizontal rule, indent/outdent, alignment, undo/redo, and more
- **Pro plugins** — Tables (full CRUD), Advanced Export, AI Writing Assistant (tier-gated)
- **Toolbar layout control** — pass an ordered array of plugin IDs to `toolbarLayout`; `'|'` inserts a separator

---

## 📦 Published Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@inkstream/react-editor`](packages/react-editor) | `0.1.7` | Main React component, hooks, toolbar |
| [`@inkstream/editor-core`](packages/editor-core) | `0.1.4` | ProseMirror schema, plugin system, license manager |
| [`@inkstream/heading`](packages/heading) | `0.1.5` | Standalone heading plugin (H1–H6) |
| [`@inkstream/link-bubble`](packages/link-bubble) | `0.1.5` | Inline link editing bubble (bundled in react-editor) |
| [`@inkstream/font-family`](packages/font-family) | `0.1.2` | Standalone font-family picker plugin |

> **Pro plugins** — `@inkstream/pro-plugins` is a private npm package (not on public npm).  
> Customers receive an npm token after purchase. See [DISTRIBUTION.md](./DISTRIBUTION.md).

---

## 📁 Repository Structure

```
Inkstream/                          (public monorepo)
├── apps/
│   ├── demo/                       # Next.js internal playground (localhost:3000)
│   └── website/                    # Empty stub — marketing site lives at a separate repo
├── packages/
│   ├── editor-core/                # ProseMirror schema, plugin system, license manager
│   ├── react-editor/               # React components, hooks, toolbar, CSS
│   ├── heading/                    # Standalone heading plugin
│   ├── font-family/                # Standalone font-family plugin
│   ├── link-bubble/                # Inline link editing bubble (bundled in react-editor)
│   ├── image/                      # Image insertion plugin (not yet published)
│   └── eslint-config/              # Shared ESLint configuration
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── DISTRIBUTION.md                 # Guide: installing @inkstream/pro-plugins
├── LAZY_LOADING.md                 # Guide: useLazyPlugins hook
├── LICENSE_SYSTEM_README.md        # Guide: license system architecture
├── turbo.json
└── package.json
```

> The marketing website lives at a **separate repository** and is not part of this monorepo.

---

## 🚀 Quick Start

### Install

```bash
npm install @inkstream/react-editor
```

`@inkstream/editor-core` and ProseMirror packages are installed automatically as dependencies — no additional installs required.

### Basic usage

```tsx
import { RichTextEditor } from '@inkstream/react-editor';
import { availablePlugins } from '@inkstream/editor-core';

export default function MyPage() {
  return (
    <RichTextEditor
      initialContent="<p>Hello world</p>"
      plugins={[
        availablePlugins.bold,
        availablePlugins.italic,
        availablePlugins.lists,
        availablePlugins.history,
      ]}
      onChange={(html) => console.log(html)}
    />
  );
}
```

### With standalone plugins

Some plugins are separate packages — install them individually:

```bash
npm install @inkstream/heading @inkstream/font-family
```

```tsx
import { RichTextEditor } from '@inkstream/react-editor';
import { availablePlugins } from '@inkstream/editor-core';
import { headingPlugin } from '@inkstream/heading';
import { fontFamilyPlugin } from '@inkstream/font-family';

export default function MyPage() {
  return (
    <RichTextEditor
      initialContent="<h1>Hello</h1>"
      plugins={[
        headingPlugin,
        fontFamilyPlugin,
        availablePlugins.bold,
        availablePlugins.italic,
        availablePlugins.history,
      ]}
      toolbarLayout={['heading', 'font-family', '|', 'bold', 'italic']}
    />
  );
}
```

### With ref (imperative API)

```tsx
import { useRef } from 'react';
import { EditorWithTableDialog } from '@inkstream/react-editor';
import type { EditorHandle } from '@inkstream/react-editor';
import { availablePlugins } from '@inkstream/editor-core';

export default function MyPage() {
  const editorRef = useRef<EditorHandle>(null);

  const handleSave = () => {
    const html = editorRef.current?.getContent();
    console.log(html);
  };

  return (
    <>
      <EditorWithTableDialog
        ref={editorRef}
        initialContent="<p>Hello</p>"
        plugins={Object.values(availablePlugins)}
      />
      <button onClick={handleSave}>Save</button>
    </>
  );
}
```

---

## 🔑 License Validation

Inkstream uses **server-side** license validation. The client-side key format check is for UX only — no feature unlocks happen client-side.

### Flow

1. Consumer calls `useLicenseValidation({ licenseKey, validationEndpoint })`
2. Hook POSTs `{ licenseKey }` to `validationEndpoint`
3. Server responds with `{ isValid: boolean, tier: "free" | "pro" | "premium" }`
4. `tier` flows into `RichTextEditor` and `useLazyPlugins`
5. Without a `validationEndpoint`, tier is always `"free"` — **secure by default**

### Validation endpoint contract

```ts
// POST /api/validate-license
// Request:  { licenseKey: string }
// Response: { isValid: boolean, tier: "free" | "pro" | "premium" }
```

A minimal demo implementation is at `apps/demo/src/app/api/validate-license/route.ts`.  
Replace the hardcoded keys with a database or licensing service in production.

See [LICENSE_SYSTEM_README.md](./LICENSE_SYSTEM_README.md) for the full architecture guide.

---

## 🛡️ Pro Plugins

Pro plugins are distributed as a private npm package — not on public npm.  
After purchase, customers receive an npm token to install `@inkstream/pro-plugins`.

```tsx
import { RichTextEditor, useLazyPlugins, useLicenseValidation } from '@inkstream/react-editor';
import { availablePlugins } from '@inkstream/editor-core';

export default function MyEditor({ licenseKey }: { licenseKey: string }) {
  const { tier } = useLicenseValidation({
    licenseKey,
    validationEndpoint: '/api/validate-license',
  });

  const { loadedPlugins, isLoading } = useLazyPlugins({
    validatedTier: tier,
    lazyPlugins: [
      {
        loader: (t) =>
          import('@inkstream/pro-plugins').then(m => ({ table: m.createProPlugins(t).table })),
        requiredTier: 'pro',
        pluginKey: 'table',
      },
    ],
  });

  return (
    <RichTextEditor
      plugins={[...Object.values(availablePlugins), ...loadedPlugins]}
      licenseKey={licenseKey}
      licenseValidationEndpoint="/api/validate-license"
    />
  );
}
```

See [DISTRIBUTION.md](./DISTRIBUTION.md) for the full customer setup guide.  
See [LAZY_LOADING.md](./LAZY_LOADING.md) for the `useLazyPlugins` hook reference.

---

## 🔌 Plugin Architecture

Every capability is a plugin implementing the `Plugin` interface. Use the `createPlugin()` factory:

```ts
import { createPlugin } from '@inkstream/editor-core';

export const myPlugin = createPlugin({
  name: 'my-plugin',
  tier: 'free',                        // 'free' | 'pro' | 'premium', defaults to 'free'
  marks: { myMark: { /* MarkSpec */ } },
  getProseMirrorPlugins: (schema) => [ /* ProseMirror plugins */ ],
  getToolbarItems: (schema) => new Map([['my-plugin', { id: 'my-plugin', icon: '…', command: … }]]),
  getInputRules: (schema) => [ /* InputRule[] */ ],
  getKeymap: (schema) => ({ 'Mod-m': /* command */ }),
});
```

Built-in plugins available via `availablePlugins` from `@inkstream/editor-core`:

`bold` · `italic` · `underline` · `strike` · `alignment` · `image` · `indent` · `lists` · `taskList` · `blockquote` · `horizontalLine` · `textColor` · `highlight` · `codeBlock` · `code` · `superscript` · `subscript` · `history`

---

## 🛠️ Dev Setup

```bash
# Install dependencies
pnpm install

# Start all dev servers
pnpm dev           # demo app at http://localhost:3000

# Build all packages
pnpm build

# Run tests (editor-core only — 733 tests)
cd packages/editor-core
pnpm test

# Lint all packages
pnpm lint
```

### Docker

```bash
docker-compose up --build
# → http://localhost:3000
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Editor Engine | ProseMirror |
| UI Framework | React 19 |
| App Framework | Next.js 16 (App Router) |
| Build System | Turborepo + pnpm workspaces |
| Package Bundler | tsup (CJS + ESM output) |
| TypeScript | Strict mode throughout |
| License Validation | Server-side REST endpoint |
| Pro Distribution | Private npm registry |

---

## 📄 License

MIT — free for personal and commercial use.

> Pro plugins (`@inkstream/pro-plugins`) are distributed under a commercial license.  
> See [DISTRIBUTION.md](./DISTRIBUTION.md) for details.
