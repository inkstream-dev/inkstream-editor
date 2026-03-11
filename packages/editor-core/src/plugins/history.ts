import { createPlugin } from './plugin-factory';
import { EditorState } from '@inkstream/pm/state';
import { history, undo, redo, undoDepth, redoDepth } from '@inkstream/pm/history';
import { ToolbarItem } from './index';

// ─── SVG Icons ───────────────────────────────────────────────────────────────
// Counter-clockwise arc with arrowhead — universal undo symbol

const svgUndo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3.5 9 C3.5 5.5 6 3 9 3 C12 3 14 5.5 14 8.5 C14 11.5 12 13.5 9 13.5 L5 13.5"/>
  <polyline points="1.5,7 3.5,9 5.5,7"/>
</svg>`;

// Clockwise arc with arrowhead — universal redo symbol
const svgRedo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12.5 9 C12.5 5.5 10 3 7 3 C4 3 2 5.5 2 8.5 C2 11.5 4 13.5 7 13.5 L11 13.5"/>
  <polyline points="14.5,7 12.5,9 10.5,7"/>
</svg>`;

// ─── Plugin ──────────────────────────────────────────────────────────────────

export const historyPlugin = createPlugin({
  name: 'history',

  getProseMirrorPlugins: () => [
    // prosemirror-history manages the full undo/redo stack:
    // - Groups rapid consecutive changes within newGroupDelay into a single undo step
    // - Caps stack at depth events (protects against unbounded memory growth)
    // - Handles IME composition, paste, and programmatic transactions correctly
    //   via the appendedTransaction mechanism and history metadata
    history({
      depth: 100,       // max undoable events — prevents unbounded memory growth
      newGroupDelay: 500, // ms — consecutive edits within this window merge into one undo step
    }),
  ],

  // Undo/redo shortcuts in getKeymap — placed here (not getProseMirrorPlugins) for
  // clarity; no other plugin defines Mod-z/Mod-y so there is no overwrite risk.
  getKeymap: () => ({
    'Mod-z': undo,
    'Shift-Mod-z': redo,
    'Mod-y': redo,        // Windows convention
  }),

  getToolbarItems: (): ToolbarItem[] => [
    {
      id: 'undo',
      iconHtml: svgUndo,
      tooltip: 'Undo (Ctrl+Z)',
      command: undo,
      // Disable when nothing to undo — prevents misleading active appearance
      isEnabled: (state: EditorState) => undoDepth(state) > 0,
    },
    {
      id: 'redo',
      iconHtml: svgRedo,
      tooltip: 'Redo (Ctrl+Shift+Z)',
      command: redo,
      // Disable when nothing to redo
      isEnabled: (state: EditorState) => redoDepth(state) > 0,
    },
  ],
});
