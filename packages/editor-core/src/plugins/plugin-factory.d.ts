import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { ToolbarItem, Plugin } from './index';
import { InputRule } from 'prosemirror-inputrules';
import { PluginTier } from '../license';
export interface PluginConfig {
    name: string;
    tier?: PluginTier;
    description?: string;
    nodes?: {
        [key: string]: any;
    };
    marks?: {
        [key: string]: any;
    };
    getProseMirrorPlugins?: (schema: Schema) => ProseMirrorPlugin[];
    getToolbarItems?: (schema: Schema, options?: any) => ToolbarItem[];
    getInputRules?: (schema: Schema) => InputRule[];
    getKeymap?: (schema: Schema) => {
        [key: string]: any;
    };
}
export declare function createPlugin(config: PluginConfig): Plugin;
