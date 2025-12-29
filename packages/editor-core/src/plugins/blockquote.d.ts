import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { Plugin, ToolbarItem } from './index';
export declare class BlockquotePlugin implements Plugin {
    name: string;
    tier: "free";
    description: string;
    nodes: {
        blockquote: {
            content: string;
            group: string;
            parseDOM: {
                tag: string;
            }[];
            toDOM(): (string | number)[];
        };
    };
    getProseMirrorPlugins(schema: Schema): ProseMirrorPlugin[];
    getToolbarItems(schema: Schema): ToolbarItem[];
}
