import { Schema } from '@inkstream/pm/model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from '@inkstream/pm/state';
import { ToolbarItem, Plugin } from './index';
import { InputRule } from '@inkstream/pm/inputrules';
import { PluginTier } from '../license';

export interface PluginConfig {
  name: string;
  tier?: PluginTier; // Plugin tier - defaults to 'free'
  description?: string; // Plugin description
  nodes?: { [key: string]: any };
  marks?: { [key: string]: any };
  getProseMirrorPlugins?: (schema: Schema) => ProseMirrorPlugin[];
  getToolbarItems?: (schema: Schema, options?: any) => ToolbarItem[]; // Accept optional options parameter
  getInputRules?: (schema: Schema) => InputRule[];
  getKeymap?: (schema: Schema) => { [key: string]: any };
}

export function createPlugin(config: PluginConfig): Plugin {
  return {
    name: config.name,
    tier: config.tier || 'free', // Default to free
    description: config.description,
    nodes: config.nodes,
    marks: config.marks,
    getProseMirrorPlugins: config.getProseMirrorPlugins || (() => []),
    getToolbarItems: config.getToolbarItems || (() => []),
    getInputRules: config.getInputRules || (() => []),
    getKeymap: config.getKeymap || (() => ({})),
  };
}
