import { Transaction } from 'prosemirror-state';
import { PluginManager, Plugin, ToolbarItem } from './plugins';
import { BlockquotePlugin } from './plugins/blockquote';
import { LinkBubbleWrapperPlugin } from './plugins/link-bubble-wrapper';
import { inkstreamSchema } from './schema';
export { inkstreamSchema };
export * from './license';
export declare const availablePlugins: {
    bold: Plugin;
    underline: Plugin;
    italic: Plugin;
    strike: Plugin;
    alignLeft: Plugin;
    alignCenter: Plugin;
    alignRight: Plugin;
    image: Plugin;
    indent: Plugin;
    bulletList: Plugin;
    orderedList: Plugin;
    code: Plugin;
    history: Plugin;
    listItem: Plugin;
    heading: Plugin;
    blockquote: BlockquotePlugin;
    horizontalLine: Plugin;
    textColor: Plugin;
    highlight: Plugin;
    codeBlock: Plugin;
    linkBubble: LinkBubbleWrapperPlugin;
    fontFamily: Plugin;
};
/**
 * Creates ProseMirror plugins from a given array of Inkstream plugins
 * @param plugins - Array of Plugin instances to use
 * @returns Array of ProseMirror plugins configured with the schema
 */
export declare const inkstreamPlugins: (plugins: Plugin[]) => (import("prosemirror-state").Plugin<any> | import("prosemirror-state").Plugin<{
    transform: Transaction;
    from: number;
    to: number;
    text: string;
} | null>)[];
export type { Plugin, ToolbarItem };
export { PluginManager };
export { createPlugin } from './plugins/plugin-factory';
