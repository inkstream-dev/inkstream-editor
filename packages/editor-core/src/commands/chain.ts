import { EditorView } from '@inkstream/pm/view';
import type { CommandsMap } from './types';

/**
 * A fluent command chain returned by `editor.chain()` and `editor.can()`.
 *
 * Every command registered by a plugin becomes a method on this object.
 * Methods return `this` so calls can be chained:
 *
 * ```ts
 * editorRef.current?.chain()
 *   .toggleBold()
 *   .setHeading(2)
 *   .focus()
 *   .run();
 * ```
 *
 * Use `editor.can()` to test whether a command is applicable without
 * applying any changes:
 *
 * ```ts
 * const canBold = editorRef.current?.can().toggleBold().run(); // boolean
 * ```
 *
 * **Transaction semantics:** each command dispatches its own transaction.
 * This keeps the implementation straightforward and ensures position mappings
 * are always correct. Compound operations that need a single undo step can use
 * ProseMirror's `closeHistory` transaction meta to merge the undo entries.
 */
export class CommandChain {
  /** @internal Queued steps; each receives a live EditorView and returns boolean. */
  readonly _queue: Array<(view: EditorView) => boolean> = [];

  constructor(
    /** @internal */
    readonly _getView: () => EditorView | null,
    /** @internal */
    readonly _commands: CommandsMap,
    /**
     * When `true`, dispatch is set to `undefined` inside commands so they
     * test feasibility without applying any changes.
     * @internal
     */
    readonly _isDryRun: boolean = false,
  ) {
    // Attach every registered command as a chainable method at construction
    // time, so they appear on the object before the consumer calls them.
    for (const [name, creator] of Object.entries(_commands)) {
      (this as any)[name] = (...args: any[]): this => {
        const commandFn = creator(...args);
        this._queue.push((view: EditorView): boolean => {
          const dispatch = _isDryRun
            ? undefined
            : (tr: any) => view.dispatch(tr);
          return commandFn({
            state: view.state,
            dispatch,
            view,
            tr: view.state.tr,
          });
        });
        return this;
      };
    }
  }

  /**
   * Move browser focus to the editor.
   * In dry-run mode this is a no-op that always returns `true`.
   */
  focus(): this {
    this._queue.push((view: EditorView): boolean => {
      if (!this._isDryRun) view.focus();
      return true;
    });
    return this;
  }

  /**
   * Execute all queued commands in order.
   *
   * Returns `true` if every command in the chain reported success.
   * Returns `false` immediately if the EditorView is not yet mounted.
   */
  run(): boolean {
    const view = this._getView();
    if (!view) return false;

    let allSucceeded = true;
    for (const step of this._queue) {
      if (!step(view)) allSucceeded = false;
    }
    return allSucceeded;
  }
}

/**
 * The type returned by `editor.chain()` and `editor.can()`.
 *
 * Dynamic command methods (contributed by plugins via `addCommands`) are
 * accessible through the index signature. Built-in methods (`focus`, `run`)
 * are statically typed on `CommandChain`.
 *
 * Plugin packages can augment this type via declaration merging to add
 * fully-typed signatures for their own commands:
 *
 * ```ts
 * // packages/bold/src/index.ts
 * declare module '@inkstream/editor-core' {
 *   interface ChainedCommandsOverrides {
 *     toggleBold(): ChainedCommands;
 *   }
 * }
 * ```
 */
export type ChainedCommands = CommandChain & {
  [commandName: string]: (...args: any[]) => ChainedCommands;
};
