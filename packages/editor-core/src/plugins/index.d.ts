import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { InputRule } from 'prosemirror-inputrules';
import { PluginTier } from '../license';
export interface ToolbarItem {
    id: string;
    icon: string;
    tooltip: string;
    command?: (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => boolean;
    onClick?: () => void;
    isActive?: (state: EditorState) => boolean;
    isVisible?: (state: EditorState) => boolean;
    type?: 'dropdown' | 'color-picker';
    children?: ToolbarItem[];
    onColorChange?: (color: string) => (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
}
export interface Plugin {
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
export declare class PluginManager {
    private plugins;
    private pluginRegistry;
    registerPlugin(plugin: Plugin): void;
    clearPlugins(): void;
    getProseMirrorPlugins(schema: Schema): ProseMirrorPlugin[];
    getNodes(): {
        [key: string]: any;
    };
    getToolbarItems(schema: Schema, pluginOptions?: {
        [key: string]: any;
    }): Map<string, ToolbarItem>;
    getMarks(): {
        [key: string]: any;
    };
    getPlugin(name: string): Plugin | undefined;
    getPlugins(): Plugin[];
}
