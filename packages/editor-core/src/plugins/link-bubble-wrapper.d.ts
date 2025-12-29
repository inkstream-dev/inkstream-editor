import { Plugin, ToolbarItem } from '../plugins';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';
export declare class LinkBubbleWrapperPlugin implements Plugin {
    name: string;
    tier: "free";
    description: string;
    getProseMirrorPlugins(schema: Schema): ProseMirrorPlugin[];
    getToolbarItems(schema: Schema): ToolbarItem[];
}
