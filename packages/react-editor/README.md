# @inkstream/react-editor

The main React package for the Inkstream editor SDK. Install this package to get the fully-featured rich text editor component, hooks, and toolbar — `@inkstream/editor-core` and all required ProseMirror packages are installed automatically.

## Installation

```bash
npm install @inkstream/react-editor
```

No additional installs required. ProseMirror packages and `@inkstream/editor-core` are bundled as dependencies.

> **Standalone plugins** (`@inkstream/heading`, `@inkstream/font-family`) must be installed separately — see their respective READMEs.

## Key exports

| Export | Description |
|--------|-------------|
| `RichTextEditor` | Core editor React component |
| `EditorWithTableDialog` | `RichTextEditor` wrapped with a table-insertion dialog |
| `useLazyPlugins` | Hook for lazy-loading pro plugins after tier confirmation |
| `useLicenseValidation` | Hook for server-side license key validation |
| `EditorHandle` | TypeScript interface for the imperative ref API |

## `RichTextEditor` props

| Prop | Type | Description |
|------|------|-------------|
| `initialContent` | `string` | Initial HTML content |
| `plugins` | `Plugin[]` | Plugin instances to register. Defaults to all built-in plugins. |
| `pluginOptions` | `object` | Per-plugin options, keyed by plugin name |
| `toolbarLayout` | `string[]` | Ordered plugin IDs for the toolbar. `'|'` inserts a separator. Items not listed are excluded. |
| `licenseKey` | `string` | License key string |
| `licenseValidationEndpoint` | `string` | URL of your server-side POST validation endpoint |
| `onLicenseError` | `(plugin, tier) => void` | Called when a plugin's tier requirement is not met |
| `onChange` | `(html: string) => void` | Fires on every content change with the serialized HTML |
| `onEditorReady` | `(view: EditorView) => void` | Called once with the EditorView instance after mount |

## `EditorWithTableDialog`

Wraps `RichTextEditor` and adds a table-insertion dialog. Accepts a forwarded ref with the `EditorHandle` interface.

```tsx
import { useRef } from 'react';
import { EditorWithTableDialog } from '@inkstream/react-editor';
import type { EditorHandle } from '@inkstream/react-editor';
import { availablePlugins } from '@inkstream/editor-core';

export default function MyPage() {
  const editorRef = useRef<EditorHandle>(null);

  return (
    <EditorWithTableDialog
      ref={editorRef}
      initialContent="<p>Hello world</p>"
      plugins={Object.values(availablePlugins)}
      onChange={(html) => console.log(html)}
    />
  );
}
```

## `EditorHandle` ref API

```ts
interface EditorHandle {
  /** Returns the current editor content serialized as an HTML string. */
  getContent(): string;
  /** Focuses the editor. */
  focus(): void;
}
```

Usage:
```tsx
const html = editorRef.current?.getContent();
editorRef.current?.focus();
```

## CSS

Editor styles are injected automatically on import — no manual CSS import is needed.

## `useLicenseValidation`

```tsx
import { useLicenseValidation } from '@inkstream/react-editor';

const { tier, isValidating, error } = useLicenseValidation({
  licenseKey: 'INKSTREAM-PRO-ABC123',
  validationEndpoint: '/api/validate-license',
});
```

- Without `validationEndpoint`, `tier` is always `'free'`
- `tier` is the authoritative server-validated value — never derived from the key string

## `useLazyPlugins`

```tsx
import { useLazyPlugins } from '@inkstream/react-editor';

const { loadedPlugins, isLoading, error } = useLazyPlugins({
  validatedTier: tier,       // from useLicenseValidation
  lazyPlugins: [
    {
      loader: (t) =>
        import('@inkstream/pro-plugins').then(m => ({ table: m.createProPlugins(t).table })),
      requiredTier: 'pro',
      pluginKey: 'table',
    },
  ],
});
```

The `loader` function receives the server-validated `tier` as its first argument. See [LAZY_LOADING.md](../../LAZY_LOADING.md) for the full guide.

## Toolbar layout

Control button order and visibility with the `toolbarLayout` prop:

```tsx
<RichTextEditor
  toolbarLayout={['bold', 'italic', 'underline', '|', 'lists', 'blockquote', '|', 'history']}
  plugins={Object.values(availablePlugins)}
/>
```

- Items are rendered in the order listed
- `'|'` inserts a visual separator
- Plugins not in the list are excluded from the toolbar

## License

MIT
