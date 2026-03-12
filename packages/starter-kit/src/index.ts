/**
 * @inkstream/starter-kit
 *
 * Aggregates all first-party Inkstream plugins and exports them as the
 * `availablePlugins` map and `corePlugins` array.
 *
 * Use this package when you want the full default set of plugins without
 * importing each one individually.
 *
 * @example
 * ```ts
 * import { availablePlugins, corePlugins } from '@inkstream/starter-kit';
 * import { RichTextEditor } from '@inkstream/react-editor';
 *
 * export default function App() {
 *   return (
 *     <RichTextEditor
 *       plugins={[
 *         ...corePlugins,
 *         availablePlugins.bold,
 *         availablePlugins.italic,
 *       ]}
 *     />
 *   );
 * }
 * ```
 */

import type { Plugin } from '@inkstream/editor-core';

// Structural / core nodes
export { paragraphPlugin } from '@inkstream/paragraph';
export { hardBreakPlugin } from '@inkstream/hard-break';
export { blockquotePlugin, blockquoteToolbarItem, toggleBlockquote } from '@inkstream/blockquote';

// Inline marks
export { boldPlugin } from '@inkstream/bold';
export { italicPlugin } from '@inkstream/italic';
export { underlinePlugin } from '@inkstream/underline';
export { strikePlugin } from '@inkstream/strike';
export { codePlugin } from '@inkstream/code';
export { superscriptPlugin } from '@inkstream/superscript';
export { subscriptPlugin } from '@inkstream/subscript';

// Block formatting
export { alignmentPlugin, setAlignment, getActiveAlignment } from '@inkstream/alignment';
export type { AlignValue } from '@inkstream/alignment';
export { indentPlugin } from '@inkstream/indent';

// Rich content
export { imagePlugin } from '@inkstream/image';
export { horizontalRulePlugin, insertDivider } from '@inkstream/horizontal-rule';
export type { DividerOptions } from '@inkstream/horizontal-rule';
export { codeBlockPlugin } from '@inkstream/code-block';
export { textColorPlugin, DEFAULT_TEXT_COLOR_PALETTE } from '@inkstream/text-color';
export type { ColorEntry, TextColorOptions } from '@inkstream/text-color';
export { highlightPlugin, DEFAULT_HIGHLIGHT_PALETTE } from '@inkstream/highlight';
export type { HighlightColorEntry, HighlightOptions } from '@inkstream/highlight';

// Lists
export { listsPlugin, taskListPlugin, bulletListPlugin, orderedListPlugin, listItemPlugin } from '@inkstream/lists';

// Utilities
export { historyPlugin } from '@inkstream/history';

// Heading — from @inkstream/heading (full plugin with toolbar + keymap)
export { headingPlugin } from '@inkstream/heading';

// ---------------------------------------------------------------------------
// Import plugin instances for the aggregated exports below
// ---------------------------------------------------------------------------
import { paragraphPlugin } from '@inkstream/paragraph';
import { hardBreakPlugin } from '@inkstream/hard-break';
import { blockquotePlugin } from '@inkstream/blockquote';
import { boldPlugin } from '@inkstream/bold';
import { italicPlugin } from '@inkstream/italic';
import { underlinePlugin } from '@inkstream/underline';
import { strikePlugin } from '@inkstream/strike';
import { codePlugin } from '@inkstream/code';
import { alignmentPlugin } from '@inkstream/alignment';
import { indentPlugin } from '@inkstream/indent';
import { imagePlugin } from '@inkstream/image';
import { horizontalRulePlugin } from '@inkstream/horizontal-rule';
import { historyPlugin } from '@inkstream/history';
import { textColorPlugin } from '@inkstream/text-color';
import { highlightPlugin } from '@inkstream/highlight';
import { codeBlockPlugin } from '@inkstream/code-block';
import { superscriptPlugin } from '@inkstream/superscript';
import { subscriptPlugin } from '@inkstream/subscript';
import { listsPlugin, taskListPlugin, bulletListPlugin, orderedListPlugin, listItemPlugin } from '@inkstream/lists';
import { headingPlugin } from '@inkstream/heading';

/**
 * All available Inkstream plugins keyed by name.
 *
 * Note: For heading with full toolbar + keyboard shortcuts, use
 * `availablePlugins.heading` (from `@inkstream/heading`).
 */
export const availablePlugins = {
  // Core structural nodes — required for any functional editor instance.
  paragraph: paragraphPlugin,
  hardBreak: hardBreakPlugin,
  heading: headingPlugin,
  blockquote: blockquotePlugin,

  bold: boldPlugin,
  underline: underlinePlugin,
  italic: italicPlugin,
  strike: strikePlugin,
  // Unified alignment plugin (all 4 alignments + SVG icons + keyboard shortcuts)
  alignment: alignmentPlugin,
  image: imagePlugin,
  indent: indentPlugin,
  // Unified list plugin (replaces bulletList + orderedList + listItem)
  lists: listsPlugin,
  taskList: taskListPlugin,
  // Legacy individual list plugins kept for backward compatibility
  bulletList: bulletListPlugin,
  orderedList: orderedListPlugin,
  listItem: listItemPlugin,
  horizontalLine: horizontalRulePlugin,
  textColor: textColorPlugin,
  highlight: highlightPlugin,
  codeBlock: codeBlockPlugin,
  code: codePlugin,
  superscript: superscriptPlugin,
  subscript: subscriptPlugin,
  history: historyPlugin,
};

/**
 * The minimal set of plugins needed for a functional rich-text editor:
 * paragraph, blockquote, and hard_break.
 */
export const corePlugins: Plugin[] = [
  paragraphPlugin,
  hardBreakPlugin,
  blockquotePlugin,
];
