# Inkstream

A developer-focused, extensible WYSIWYG rich text editor built on **ProseMirror** with a modular plugin system, React wrapper, and a freemium licensing model — designed to be embedded in any React/Next.js application.

---

## ✨ Features

- **Modular plugin system** — every formatting capability is a first-class plugin; register only what you need
- **Freemium licensing** — server-validated tiers (`free` / `pro` / `premium`) gate plugin availability at runtime
- **Pro plugin distribution** — Pro/Premium plugins shipped as a private npm package (`@inkstream-dev/pro-plugins`) separate from the open-source core
- **Lazy loading** — Pro/Premium plugin code is only downloaded after the license tier is server-confirmed
- **Content API** — `onChange` prop for live HTML updates; `ref.getContent()` / `ref.focus()` for imperative access
- **Rich built-in plugins** — bold, italic, underline, strikethrough, headings, lists, blockquote, code blocks, images, text colour, highlight, horizontal rule, indent/outdent, undo/redo, link bubble
- **Pro plugins** — Tables (full CRUD), Advanced Export, AI Writing Assistant (tier-gated)
- **Toolbar layout control** — pass an ordered array of plugin IDs to `toolbarLayout`; `'|'` inserts a separator

---

## 📁 Repository Structure

```
Inkstream/                         (public monorepo)
├── apps/
│   └── demo/                      # Next.js demo/playground
├── packages/
│   ├── editor-core/               # ProseMirror schema, plugin system, license manager
│   ├── react-editor/              # React components, hooks, toolbar
│   ├── heading/                   # Heading plugin (external package)
│   ├── font-family/               # Font-family plugin
│   ├── link-bubble/               # Inline link editing bubble
│   └── image/                     # Image insertion plugin
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── DISTRIBUTION.md                # Guide: installing @inkstream-dev/pro-plugins
├── turbo.json
└── package.json
```

> **Pro plugins** live in a separate private repository:  
> `git@github.com:yogeshkoli/inkstream-pro-plugins.git`  
> Published as `@inkstream-dev/pro-plugins` on GitHub Packages.  
> See [DISTRIBUTION.md](./DISTRIBUTION.md) for the full customer setup guide.

---

## 🏗️ Tech Stack

| Layer              | Technology                               |
|--------------------|------------------------------------------|
| Editor Engine      | ProseMirror                              |
| UI Framework       | React 18 + Next.js 14 (App Router)       |
| Build System       | Turborepo + pnpm workspaces              |
| TypeScript         | Strict mode throughout                   |
| Styling            | Tailwind CSS (demo) + scoped editor CSS  |
| License Validation | Server-side REST endpoint (per-consumer) |
| Pro Distribution   | GitHub Packages (private registry)       |
| Local Dev          | Docker + docker-compose                  |

---

## 🚀 Quick Start

### Run the demo locally

```bash
pnpm install
pnpm dev          # starts all packages in dev mode
# → http://localhost:3000
```

### Build all packages

```bash
pnpm build
```

### Run tests (`editor-core` only)

```bash
cd packages/editor-core
pnpm test
```

---

## 📦 Installation in your app

### Free tier (open source)

```bash
npm install @inkstream/react-editor @inkstream/editor-core
```

```tsx
import { EditorWithTableDialog } from '@inkstream/react-editor';
import { availablePlugins } from '@inkstream/editor-core';

export default function MyPage() {
  return (
    <EditorWithTableDialog
      initialContent="<p>Hello world</p>"
      plugins={[
        availablePlugins.bold,
        availablePlugins.italic,
        availablePlugins.bulletList,
        availablePlugins.history,
      ]}
    />
  );
}
```

### Pro tier

See [DISTRIBUTION.md](./DISTRIBUTION.md) for registry token setup, then:

```bash
npm install @inkstream-dev/pro-plugins
```

```tsx
import { EditorWithTableDialog, useLazyPlugins, useLicenseValidation } from '@inkstream/react-editor';
import type { EditorHandle } from '@inkstream/react-editor';
import { availablePlugins } from '@inkstream/editor-core';
import { useRef } from 'react';

export default function MyPage() {
  const editorRef = useRef<EditorHandle>(null);

  const { tier } = useLicenseValidation({
    licenseKey: 'INKSTREAM-PRO-…',
    validationEndpoint: '/api/validate-license',
  });

  const { loadedPlugins } = useLazyPlugins({
    validatedTier: tier,
    lazyPlugins: [{
      loader: (t) => import('@inkstream-dev/pro-plugins').then(m => ({ table: m.createProPlugins(t).table })),
      requiredTier: 'pro',
      pluginKey: 'table',
    }],
  });

  const handleSave = () => {
    const html = editorRef.current?.getContent();
    console.log(html); // full HTML string
  };

  return (
    <>
      <EditorWithTableDialog
        ref={editorRef}
        initialContent="<p>Hello</p>"
        plugins={[...Object.values(availablePlugins), ...loadedPlugins]}
        licenseValidationEndpoint="/api/validate-license"
        licenseKey="INKSTREAM-PRO-…"
        onChange={(html) => console.log('live:', html)}
        toolbarLayout={['bold', 'italic', '|', 'table']}
      />
      <button onClick={handleSave}>Save</button>
    </>
  );
}
```

---

## 🔑 License Validation

Inkstream uses **server-side** license validation. The client-side key format check is for UX only — no feature unlocks client-side.

### Flow

1. Consumer calls `useLicenseValidation({ licenseKey, validationEndpoint })`
2. Hook POSTs `{ licenseKey }` to `validationEndpoint`
3. Server responds with `{ isValid: boolean, tier: "free" | "pro" | "premium" }`
4. `validatedTier` flows into `RichTextEditor` and `useLazyPlugins`
5. Without a `validationEndpoint`, tier is always `"free"` — **secure by default**

### Validation endpoint contract

```ts
// POST /api/validate-license
// Request:  { licenseKey: string }
// Response: { isValid: boolean, tier: "free" | "pro" | "premium" }
```

The demo ships a minimal implementation at  
`apps/demo/src/app/api/validate-license/route.ts` — replace the hardcoded keys with a real database/licensing service in production.

---

## 🧩 Component API

### `<EditorWithTableDialog>`

| Prop | Type | Description |
|------|------|-------------|
| `initialContent` | `string` | Initial HTML content |
| `plugins` | `Plugin[]` | Array of plugin instances to register |
| `toolbarLayout` | `string[]` | Ordered plugin IDs; `'|'` = separator |
| `pluginOptions` | `object` | Per-plugin options (keyed by plugin name) |
| `licenseKey` | `string` | License key (passed to validation endpoint) |
| `licenseValidationEndpoint` | `string` | URL of your server-side validation endpoint |
| `onLicenseError` | `(plugin, tier) => void` | Called when a plugin's tier requirement isn't met |
| `onChange` | `(html: string) => void` | Fires on every content change with serialized HTML |

**Ref handle (`EditorHandle`):**

```ts
interface EditorHandle {
  getContent(): string;  // snapshot of current HTML
  focus(): void;
}
```

Usage:
```tsx
const editorRef = useRef<EditorHandle>(null);
<EditorWithTableDialog ref={editorRef} … />
// later:
const html = editorRef.current?.getContent();
```

---

## 🔌 Plugin Architecture

Every capability is a plugin implementing the `Plugin` interface:

```ts
interface Plugin {
  name: string;
  tier?: 'free' | 'pro' | 'premium';   // defaults to 'free'
  nodes?: NodeSpec map;
  marks?: MarkSpec map;
  getProseMirrorPlugins(schema): ProseMirrorPlugin[];
  getToolbarItems(schema, options?): Map<string, ToolbarItem>;
  getInputRules(schema): InputRule[];
  getKeymap(schema): Keymap;
}
```

Always create plugins with the `createPlugin()` factory:

```ts
import { createPlugin } from '@inkstream/editor-core';

export const myPlugin = createPlugin({
  name: 'my-plugin',
  tier: 'free',
  marks: { myMark: { /* ProseMirror MarkSpec */ } },
  getProseMirrorPlugins: (schema) => [ /* … */ ],
  getToolbarItems: (schema) => new Map([['my-plugin', { id: 'my-plugin', icon: '…', command: … }]]),
});
```

Then register it with `PluginManager` (or pass directly in the `plugins` prop).

---

## 🛡️ Security Model

| Layer | Protection |
|-------|-----------|
| Private registry | Pro source code not on public npm |
| Runtime guard (`guardPlugin`) | All Pro plugin methods return no-ops without server-validated tier |
| Server validation | Tier determined server-side; client key check is UX-only |
| Secure by default | No `validationEndpoint` → always free tier |

---

## 🐳 Docker

```bash
docker-compose up --build
# → http://localhost:3000
```

---

## 📄 License

MIT — free for personal and commercial use.

> Pro plugins (`@inkstream-dev/pro-plugins`) are distributed under a commercial license.  
> See [DISTRIBUTION.md](./DISTRIBUTION.md) for details.

