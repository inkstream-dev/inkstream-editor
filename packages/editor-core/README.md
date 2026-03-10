# @inkstream/editor-core

The core package for the Inkstream editor SDK. Provides the ProseMirror schema builder, plugin system, built-in plugins, license manager, and utility exports used by `@inkstream/react-editor` and all standalone plugin packages.

## Installation

```bash
npm install @inkstream/editor-core
```

> **Note:** If you are using `@inkstream/react-editor`, this package is installed automatically as a dependency. You do not need to install it separately unless you are building a custom editor integration.

## Key exports

| Export | Description |
|--------|-------------|
| `availablePlugins` | Map of all built-in plugin instances |
| `createPlugin` | Factory function for creating new plugins |
| `PluginManager` | Registry that holds plugins and builds the ProseMirror schema |
| `inkstreamSchema` | Builds a `Schema` from a `PluginManager` instance |
| `inkstreamPlugins` | Builds the full ProseMirror plugin array from an Inkstream plugin list |
| `LicenseManager` | Static helpers: `isValidKeyFormat`, `canTierAccess` |
| `buildKeymap` | Builds the combined ProseMirror keymap from registered plugins |
| `buildInputRules` | Builds the combined ProseMirror input rules from registered plugins |

## Built-in plugins

All built-in plugins are available via `availablePlugins`:

```ts
import { availablePlugins } from '@inkstream/editor-core';
```

| Key | Description |
|-----|-------------|
| `bold` | Bold text mark |
| `italic` | Italic text mark |
| `underline` | Underline text mark |
| `strike` | Strikethrough text mark |
| `alignment` | Text alignment (left, center, right, justify) |
| `image` | Inline image node |
| `indent` | Paragraph indent/outdent |
| `lists` | Bullet lists, ordered lists, and list items (unified) |
| `taskList` | Checkbox task list |
| `blockquote` | Block quotation |
| `horizontalLine` | Horizontal rule node |
| `textColor` | Text colour mark |
| `highlight` | Text highlight mark |
| `codeBlock` | Fenced code block node |
| `code` | Inline code mark |
| `superscript` | Superscript mark |
| `subscript` | Subscript mark |
| `history` | Undo/redo (prosemirror-history) |

## Plugin interface

Every plugin implements this interface:

```ts
interface Plugin {
  name: string;
  tier?: 'free' | 'pro' | 'premium';          // defaults to 'free'
  nodes?: Record<string, NodeSpec>;
  marks?: Record<string, MarkSpec>;
  getProseMirrorPlugins(schema: Schema): ProseMirrorPlugin[];
  getToolbarItems(schema: Schema, options?: any): Map<string, ToolbarItem>;
  getInputRules(schema: Schema): InputRule[];
  getKeymap(schema: Schema): Record<string, Command>;
}
```

## Creating a plugin

Use `createPlugin()` to create a new plugin with the correct interface:

```ts
import { createPlugin } from '@inkstream/editor-core';

export const myPlugin = createPlugin({
  name: 'my-plugin',
  tier: 'free',
  marks: {
    myMark: {
      parseDOM: [{ tag: 'mark' }],
      toDOM: () => ['mark', 0],
    },
  },
  getProseMirrorPlugins: (schema) => [],
  getToolbarItems: (schema) => new Map([
    ['my-plugin', { id: 'my-plugin', icon: '…', tooltip: 'My mark', command: (state, dispatch) => { /* … */ } }],
  ]),
  getInputRules: (schema) => [],
  getKeymap: (schema) => ({}),
});
```

## `PluginManager` and schema

The schema is built dynamically from the set of registered plugins. Always build the schema from the same `PluginManager` instance that holds all your plugins:

```ts
import { PluginManager, inkstreamSchema } from '@inkstream/editor-core';
import { myPlugin } from './my-plugin';

const manager = new PluginManager();
manager.registerPlugin(myPlugin);

const schema = inkstreamSchema(manager);
```

## `LicenseManager` helpers

```ts
import { LicenseManager } from '@inkstream/editor-core';

// Format check only — UX feedback, does not grant access
LicenseManager.isValidKeyFormat('INKSTREAM-PRO-ABC123'); // → true

// Tier hierarchy check
LicenseManager.canTierAccess('premium', 'pro');   // → true
LicenseManager.canTierAccess('free', 'pro');      // → false
```

## License

MIT
