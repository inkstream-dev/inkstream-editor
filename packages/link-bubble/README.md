# @inkstream/link-bubble

Inline link editing bubble plugin for the Inkstream editor SDK. When the cursor moves into a link, a floating bubble appears with options to edit or remove the link.

## Bundled in `@inkstream/react-editor`

This package is a dependency of `@inkstream/react-editor` and is included automatically. **If you are using `@inkstream/react-editor`, you do not need to install this package.** The link bubble is available in the toolbar by default.

Install separately only if you are building a fully custom editor integration that does not use `@inkstream/react-editor`.

## Manual installation (custom integrations only)

```bash
npm install @inkstream/link-bubble
```

This package requires `@inkstream/editor-core` as a peer dependency:

```bash
npm install @inkstream/editor-core
```

## Usage in a custom integration

```ts
import { getLinkBubbleToolbarItem } from '@inkstream/link-bubble';
import { PluginManager, inkstreamSchema } from '@inkstream/editor-core';

const manager = new PluginManager();
// ... register your plugins

const schema = inkstreamSchema(manager);
const linkBubbleItem = getLinkBubbleToolbarItem(schema);
```

## Peer dependencies

| Package | Version |
|---------|---------|
| `@inkstream/editor-core` | `^0.1.4` |

## License

MIT
