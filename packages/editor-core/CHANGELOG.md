# @inkstream/editor-core

## 0.1.6

### Patch Changes

- ea8e3f9: ## `@inkstream/editor-core` — headless editor core & framework-agnostic APIs

  ### New features

  **Headless `InkstreamEditor` class**
  The editor can now be instantiated without any framework. `InkstreamEditor` manages ProseMirror state, commands, schema, plugins, undo/redo, and content serialisation independently of React.

  **`createEditor(config)`**
  Functional factory alias for `new InkstreamEditor(config)`. Preferred for Vue composables, Svelte setup blocks, and any non-class-based integration.

  ```ts
  import { createEditor } from "@inkstream/editor-core";
  const editor = createEditor({ element: el, plugins });
  ```

  **Typed event system — `editor.on()` / `editor.off()`**
  Subscribe to editor lifecycle and state events. All payloads are fully typed via `EditorEventMap`.

  | Event             | Payload         | When                           |
  | ----------------- | --------------- | ------------------------------ |
  | `ready`           | `EditorView`    | After construction             |
  | `update`          | `EditorState`   | Every transaction              |
  | `change`          | `string` (HTML) | Doc changed (debounced)        |
  | `selectionUpdate` | `EditorState`   | Selection moved, no doc change |
  | `focus`           | `FocusEvent`    | Editor gains focus             |
  | `blur`            | `FocusEvent`    | Editor loses focus             |
  | `destroy`         | —               | Before teardown                |

  ```ts
  editor.on("change", (html) => console.log(html));
  editor.on("update", (state) => syncToolbar(state));
  editor.off("change", handler);
  ```

  **`editor.executeCommand(cmd, ...args)`**
  Execute any registered command by name. Returns `true` if the command applied, `false` otherwise (unknown command, not applicable, or editor destroyed).

  ```ts
  editor.executeCommand("toggleBold");
  editor.executeCommand("undo");
  ```

  **Framework adapters (zero extra dependencies)**

  _Svelte_ — readable stores satisfying Svelte's `Readable<T>` contract:

  ```ts
  import { editorContentStore, editorStateStore } from "@inkstream/editor-core";
  const content = editorContentStore(editor); // $content in templates
  const state = editorStateStore(editor); // $state.canUndo, $state.isBold, …
  ```

  _Vue 3_ — bring-your-own-ref composable factory:

  ```ts
  import { ref, computed } from "vue";
  import { createEditorComposable } from "@inkstream/editor-core";
  export const useEditor = createEditorComposable({ ref, computed });
  // → { editor, content, isBold, canUndo, mount, destroy, executeCommand }
  ```

  _Vanilla JS / TypeScript_:

  ```ts
  import {
    mountEditor,
    bindToolbarState,
    onContentChange,
  } from "@inkstream/editor-core";
  const { editor, destroy } = mountEditor({ element: el, plugins });
  onContentChange(editor, (html) => (preview.innerHTML = html));
  bindToolbarState(editor, boldBtn, "isBold");
  ```

  **`EventEmitter<TEventMap>`**
  Exported base class for building custom event-driven extensions on top of the core. The generic parameter enforces payload types at compile time.

  ***

  ## `@inkstream/react-editor` — internal cleanup
  - **Removed duplicate `canLoadTier` logic** in `useLazyPlugins` — now delegates to `LicenseManager.canTierAccess()` from `editor-core`, eliminating a divergence risk.
  - **`EditorWithTableDialog` no longer imports `DOMSerializer`** directly — content serialisation is delegated to `RichTextEditor` via an `EditorRef` forwarded ref, keeping the component as a thin wrapper.
  - **Added `getContent(): string` to `EditorRef`** — allows any holder of an editor ref to read the current HTML without accessing ProseMirror internals.
  - Full unit test suite added (36 tests): `useEditorState`, `useLicenseValidation`, `useLazyPlugins`, `RichTextEditor`.

- Updated dependencies [ea8e3f9]
  - @inkstream/pm@0.1.2
