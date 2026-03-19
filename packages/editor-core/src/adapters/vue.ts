/**
 * Vue 3 composable adapter for `@inkstream/editor-core`.
 *
 * This module is **dependency-free** — it does NOT import from Vue. Instead it
 * provides a `createEditorComposable()` factory that, given Vue's `ref` and
 * `computed` primitives, returns a fully-typed `useEditor()` composable ready
 * to drop into any Vue 3 project.
 *
 * This design lets the `editor-core` package stay framework-agnostic while
 * giving Vue consumers a first-class reactive experience.
 *
 * ## Quick Start
 *
 * Copy `useEditor.ts` below into your Vue project, then use it as shown:
 *
 * ```ts
 * // composables/useEditor.ts  (copy this into your Vue project)
 * import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue';
 * import { createEditor, type InkstreamEditor, type InkstreamEditorConfig } from '@inkstream/editor-core';
 * import { createEditorComposable } from '@inkstream/editor-core/adapters/vue';
 *
 * export const useEditor = createEditorComposable({ ref, computed });
 * ```
 *
 * ```vue
 * <script setup lang="ts">
 * import { ref, onMounted, onUnmounted } from 'vue';
 * import { paragraphPlugin, boldPlugin } from '@inkstream/starter-kit';
 * import { useEditor } from './composables/useEditor';
 *
 * const editorEl = ref<HTMLElement | null>(null);
 * const { editor, content, isBold, canUndo, executeCommand, mount, destroy } = useEditor({
 *   plugins: [paragraphPlugin, boldPlugin],
 *   initialContent: '<p>Hello Vue!</p>',
 * });
 *
 * onMounted(() => {
 *   if (editorEl.value) mount(editorEl.value);
 * });
 * onUnmounted(destroy);
 * </script>
 *
 * <template>
 *   <div>
 *     <button :disabled="!canUndo.value" @click="executeCommand('undo')">Undo</button>
 *     <button :class="{ active: isBold.value }" @click="executeCommand('toggleBold')">Bold</button>
 *     <div ref="editorEl" />
 *     <pre>{{ content.value }}</pre>
 *   </div>
 * </template>
 * ```
 *
 * ## Advanced — direct subscription (no factory needed)
 *
 * For simpler cases you can subscribe to editor events directly inside a
 * composable without using `createEditorComposable`:
 *
 * ```ts
 * import { ref, onUnmounted } from 'vue';
 * import { createEditor } from '@inkstream/editor-core';
 *
 * export function useEditorContent(editor: InkstreamEditor) {
 *   const content = ref(editor.getContent());
 *   const unsub = editor.on('change', html => { content.value = html; });
 *   onUnmounted(() => editor.off('change', html => { content.value = html; }));
 *   return content;
 * }
 * ```
 */

import type { InkstreamEditor } from '../editor/InkstreamEditor';
import type { InkstreamEditorConfig } from '../editor/InkstreamEditor';
import type { EditorState } from '@inkstream/pm/state';

// ---------------------------------------------------------------------------
// Vue type stubs (no runtime import from Vue)
// ---------------------------------------------------------------------------

/** Minimal Vue `Ref<T>` interface — compatible with Vue 3's `Ref`. */
export interface VueRef<T> {
  value: T;
}

/** Vue `ref()` factory signature. */
export type VueRefFactory = <T>(value: T) => VueRef<T>;

/** Vue `computed()` factory signature (getter only). */
export type VueComputedFactory = <T>(getter: () => T) => VueRef<T>;

// ---------------------------------------------------------------------------
// Composable return type
// ---------------------------------------------------------------------------

/**
 * Return value of the `useEditor()` composable created by
 * {@link createEditorComposable}.
 */
export interface UseEditorReturn {
  /** The underlying `InkstreamEditor` instance, or `null` before `mount()`. */
  editor: VueRef<InkstreamEditor | null>;

  /**
   * Mount the editor into the given DOM element.
   * Call this inside `onMounted` once the template ref is available.
   */
  mount(element: HTMLElement): void;

  /** Destroy the editor and clean up all subscriptions. Call in `onUnmounted`. */
  destroy(): void;

  /**
   * Reactive: the current document serialised as HTML.
   * Updates (debounced) whenever the document content changes.
   */
  content: VueRef<string>;

  /**
   * Reactive: `true` when the bold mark is active in the current selection.
   * Suitable for toggling an "active" class on a toolbar Bold button.
   */
  isBold: VueRef<boolean>;

  /**
   * Reactive: `true` when the italic mark is active in the current selection.
   */
  isItalic: VueRef<boolean>;

  /** Reactive: `true` when an undo step is available. */
  canUndo: VueRef<boolean>;

  /** Reactive: `true` when a redo step is available. */
  canRedo: VueRef<boolean>;

  /**
   * Execute a named editor command.
   * Delegates to `editor.executeCommand(cmd, ...args)`.
   * Safe to call before `mount()` (no-ops until the editor is ready).
   */
  executeCommand(cmd: string, ...args: unknown[]): boolean;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a `useEditor()` Vue composable, injecting Vue's reactive primitives
 * (`ref`, `computed`) at creation time.
 *
 * Call this **once** in a module-level setup (e.g., `composables/useEditor.ts`),
 * then export the result and use it in components.
 *
 * @example
 * ```ts
 * // composables/useEditor.ts
 * import { ref, computed } from 'vue';
 * import { createEditorComposable } from '@inkstream/editor-core/adapters/vue';
 * export const useEditor = createEditorComposable({ ref, computed });
 * ```
 */
export function createEditorComposable({ ref, computed }: {
  ref: VueRefFactory;
  computed: VueComputedFactory;
}) {
  /**
   * Vue composable that manages an `InkstreamEditor` instance and exposes
   * reactive state refs.
   */
  return function useEditor(config: Omit<InkstreamEditorConfig, 'element'>): UseEditorReturn {
    const { createEditor } = require('../index') as { createEditor: (c: InkstreamEditorConfig) => InkstreamEditor };

    const editorRef = ref<InkstreamEditor | null>(null);
    const content = ref<string>('');
    const rawState = ref<EditorState | null>(null);

    // Derived state — recomputed whenever rawState changes.
    const isBold = computed<boolean>(() => {
      const state = rawState.value;
      if (!state || !editorRef.value) return false;
      const { schema } = editorRef.value;
      return schema.marks.strong
        ? state.storedMarks?.some(m => m.type === schema.marks.strong) ??
          state.selection.$from.marks().some(m => m.type === schema.marks.strong)
        : false;
    });

    const isItalic = computed<boolean>(() => {
      const state = rawState.value;
      if (!state || !editorRef.value) return false;
      const { schema } = editorRef.value;
      return schema.marks.em
        ? state.storedMarks?.some(m => m.type === schema.marks.em) ??
          state.selection.$from.marks().some(m => m.type === schema.marks.em)
        : false;
    });

    const canUndo = computed<boolean>(() => {
      const state = rawState.value;
      if (!state) return false;
      return getHistoryDepth(state, 'undoDepth') > 0;
    });

    const canRedo = computed<boolean>(() => {
      const state = rawState.value;
      if (!state) return false;
      return getHistoryDepth(state, 'redoDepth') > 0;
    });

    const cleanups: Array<() => void> = [];

    function mount(element: HTMLElement): void {
      const editor = createEditor({ ...config, element });
      editorRef.value = editor;
      content.value = editor.getContent();
      rawState.value = editor.getState();

      const onUpdate = (state: EditorState) => { rawState.value = state; };
      const onChange = (html: string) => { content.value = html; };

      editor.on('update', onUpdate);
      editor.on('change', onChange);

      cleanups.push(
        () => editor.off('update', onUpdate),
        () => editor.off('change', onChange),
      );
    }

    function destroy(): void {
      cleanups.forEach(fn => fn());
      cleanups.length = 0;
      editorRef.value?.destroy();
      editorRef.value = null;
    }

    function executeCommand(cmd: string, ...args: unknown[]): boolean {
      return editorRef.value?.executeCommand(cmd, ...args) ?? false;
    }

    return { editor: editorRef, mount, destroy, content, isBold, isItalic, canUndo, canRedo, executeCommand };
  };
}

// ---------------------------------------------------------------------------
// Utility (shared with svelte adapter)
// ---------------------------------------------------------------------------

function getHistoryDepth(state: EditorState, key: 'undoDepth' | 'redoDepth'): number {
  try {
    for (const plugin of state.plugins) {
      const s = plugin.getState(state);
      if (s && typeof s === 'object' && key in (s as object)) {
        return (s as Record<string, number>)[key] ?? 0;
      }
    }
  } catch { /* history plugin not registered */ }
  return 0;
}
