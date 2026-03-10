# @inkstream/heading

Standalone heading plugin for the Inkstream editor SDK. Adds H1–H6 heading nodes and corresponding toolbar buttons to any Inkstream editor instance.

## Installation

```bash
npm install @inkstream/heading
```

This package requires `@inkstream/editor-core` as a peer dependency:

```bash
npm install @inkstream/editor-core
```

If you are already using `@inkstream/react-editor`, `@inkstream/editor-core` is already installed.

## Usage

```tsx
import { RichTextEditor } from '@inkstream/react-editor';
import { availablePlugins } from '@inkstream/editor-core';
import { headingPlugin } from '@inkstream/heading';

export default function MyEditor() {
  return (
    <RichTextEditor
      initialContent="<h1>Hello world</h1>"
      plugins={[
        headingPlugin,
        availablePlugins.bold,
        availablePlugins.italic,
        availablePlugins.history,
      ]}
      toolbarLayout={['heading', '|', 'bold', 'italic', '|', 'history']}
    />
  );
}
```

## Heading levels

The plugin registers H1 through H6 heading nodes. Toolbar buttons are provided for each level. Input rules are also included — typing `# ` at the start of a line promotes it to H1, `## ` to H2, and so on.

## Peer dependencies

| Package | Version |
|---------|---------|
| `@inkstream/editor-core` | `^0.1.4` |

## License

MIT
