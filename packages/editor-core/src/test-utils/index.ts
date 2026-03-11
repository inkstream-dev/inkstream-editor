/**
 * Test utilities for Inkstream editor-core.
 *
 * Provides helpers for creating ProseMirror editor states, applying commands,
 * and building test documents. Import from this module in all test files.
 *
 * @example
 * ```ts
 * import { getTestSchema, createState, applyCommand, p, text } from '../test-utils';
 *
 * const schema = getTestSchema();
 * const state = createState(schema.node('doc', null, [
 *   p(schema, text(schema, 'Hello world')),
 * ]));
 * ```
 */

import { Schema, Node, Mark, MarkType } from '@inkstream/pm/model';
import { EditorState, Transaction, TextSelection } from '@inkstream/pm/state';
import { PluginManager, availablePlugins } from '../index';
import { inkstreamSchema } from '../schema';

// ---------------------------------------------------------------------------
// Schema singleton — build once, reuse across all tests
// ---------------------------------------------------------------------------

let _schema: Schema | null = null;

/**
 * Returns a fully-initialized schema with all available plugins registered.
 * The schema is built once and cached for the test run.
 */
export function getTestSchema(): Schema {
  if (_schema) return _schema;
  const manager = new PluginManager();
  Object.values(availablePlugins).forEach(plugin => manager.registerPlugin(plugin));
  _schema = inkstreamSchema(manager);
  return _schema;
}

// ---------------------------------------------------------------------------
// Document builders
// ---------------------------------------------------------------------------

/**
 * Creates a paragraph node with the given inline content.
 * @example p(schema, text(schema, 'Hello'))
 */
export function p(schema: Schema, ...content: (Node | string)[]): Node {
  const inline = content.map(c => (typeof c === 'string' ? schema.text(c) : c));
  return schema.node('paragraph', null, inline);
}

/**
 * Creates a text node with optional marks.
 * @example text(schema, 'hello', schema.marks.code.create())
 */
export function text(schema: Schema, str: string, ...marks: Mark[]): Node {
  return schema.text(str, marks.length ? marks : undefined);
}

/**
 * Creates a doc node from the given block nodes.
 * @example doc(schema, p(schema, 'Hello world'))
 */
export function doc(schema: Schema, ...blocks: Node[]): Node {
  return schema.node('doc', null, blocks);
}

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

/**
 * Creates an EditorState from a doc node.
 * @param docNode  The document to use as content.
 * @param pos      Optional cursor position. Defaults to position 1 (start of first block).
 */
export function createState(docNode: Node, pos?: number): EditorState {
  const schema = docNode.type.schema;
  const selection =
    pos !== undefined ? TextSelection.create(docNode, pos) : undefined;
  return EditorState.create({ schema, doc: docNode, selection });
}

/**
 * Creates an EditorState with a range (non-collapsed) selection.
 * @param docNode  The document to use as content.
 * @param from     Selection start position (inclusive).
 * @param to       Selection end position (exclusive).
 */
export function createStateWithSelection(docNode: Node, from: number, to: number): EditorState {
  const schema = docNode.type.schema;
  const selection = TextSelection.create(docNode, from, to);
  return EditorState.create({ schema, doc: docNode, selection });
}

// ---------------------------------------------------------------------------
// Command helpers
// ---------------------------------------------------------------------------

/**
 * Applies a command to an EditorState and returns the resulting state.
 * Returns null if the command declined (returned false or didn't dispatch).
 */
export function applyCommand(
  state: EditorState,
  command: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean,
): EditorState | null {
  let tr: Transaction | null = null;
  const succeeded = command(state, t => { tr = t; });
  if (!succeeded || !tr) return null;
  return state.apply(tr!);
}

/**
 * Tests whether a command can execute (dry-run, no dispatch).
 */
export function canExecute(
  state: EditorState,
  command: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean,
): boolean {
  return command(state);
}

// ---------------------------------------------------------------------------
// Mark helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if a mark of the given type covers the entire range [from, to].
 * For collapsed selections (from === to), checks marks at the cursor position.
 */
export function hasMark(state: EditorState, markType: MarkType): boolean {
  const { from, to, empty } = state.selection;
  if (empty) {
    const sel = state.selection;
    if (sel instanceof TextSelection && sel.$cursor) {
      return !!markType.isInSet(sel.$cursor.marks() || []);
    }
    return !!markType.isInSet(state.storedMarks || []);
  }
  return state.doc.rangeHasMark(from, to, markType);
}

/**
 * Returns the value of a given attribute on the block node at the cursor.
 * Useful for testing alignment, indent, heading level, etc.
 */
export function getBlockAttr(state: EditorState, attr: string): unknown {
  const { $from } = state.selection;
  return $from.parent.attrs[attr] ?? null;
}
