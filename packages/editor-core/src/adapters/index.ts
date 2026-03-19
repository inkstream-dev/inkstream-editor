/**
 * Framework adapter helpers for `@inkstream/editor-core`.
 *
 * @module
 *
 * | Import path | Framework |
 * |---|---|
 * | `@inkstream/editor-core` | All (createEditor, on/off/executeCommand) |
 * | `@inkstream/editor-core/adapters/svelte` | Svelte readable stores |
 * | `@inkstream/editor-core/adapters/vue` | Vue 3 composable factory |
 * | `@inkstream/editor-core/adapters/vanilla` | Vanilla JS / TypeScript |
 */

export type { SvelteReadable, SerializableEditorState } from './svelte';
export { editorContentStore, editorStateStore } from './svelte';

export type {
  VueRef,
  VueRefFactory,
  VueComputedFactory,
  UseEditorReturn,
} from './vue';
export { createEditorComposable } from './vue';

export type {
  VanillaEditorState,
  MountedEditor,
  BindToolbarStateOptions,
} from './vanilla';
export { mountEditor, bindToolbarState, onContentChange, onSelectionChange } from './vanilla';
