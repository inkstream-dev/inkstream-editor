import { Plugin } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import { ToolbarItem } from '../../editor-core/src/plugins';
export declare const linkBubblePlugin: Plugin<any>;
export declare const getLinkBubbleToolbarItem: (schema: Schema) => ToolbarItem;
