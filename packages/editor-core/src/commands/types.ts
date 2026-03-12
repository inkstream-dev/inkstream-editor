import { EditorState, Transaction } from '@inkstream/pm/state';
import { EditorView } from '@inkstream/pm/view';

/**
 * Props passed to every command at execution time.
 *
 * Mirrors the ProseMirror command signature `(state, dispatch?, view?) => boolean`
 * but bundles everything into a single context object so commands can be
 * composed, tested, and used in chains uniformly.
 */
export interface CommandProps {
  /** The current editor state (always live — reads from view.state). */
  state: EditorState;
  /**
   * Dispatch function. When `undefined` (inside `can()` dry-run checks)
   * the command should NOT apply any changes — only test feasibility.
   *
   * Compatible with the ProseMirror `dispatch?` convention: commands that
   * respect the optional dispatch will work correctly in both contexts.
   */
  dispatch: ((tr: Transaction) => void) | undefined;
  /** The live EditorView. */
  view: EditorView;
  /** Convenience: a fresh transaction from the current state. */
  tr: Transaction;
}

/**
 * A command function: receives props and returns `true` if the command
 * ran (or could run in dry-run mode), `false` if it was not applicable.
 */
export type CommandFunction = (props: CommandProps) => boolean;

/**
 * A command creator: called with optional user-supplied arguments, returns
 * the CommandFunction to be executed.
 *
 * Commands with no arguments:  `() => (props) => boolean`
 * Commands with arguments:     `(level: number) => (props) => boolean`
 */
export type CommandCreator<TArgs extends any[] = any[]> = (
  ...args: TArgs
) => CommandFunction;

/**
 * A map of command name → CommandCreator, as returned by `addCommands()`.
 * Keyed by the public command name (e.g. `'toggleBold'`, `'setHeading'`).
 */
export type CommandsMap = Record<string, CommandCreator>;
