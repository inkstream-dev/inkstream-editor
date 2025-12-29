import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { ToolbarItem, Plugin } from './index';
import { InputRule } from 'prosemirror-inputrules';

export interface PluginConfig {
  name: string;
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
    nodes: config.nodes,
    marks: config.marks,
    getProseMirrorPlugins: config.getProseMirrorPlugins || (() => []),
    getToolbarItems: config.getToolbarItems || (() => []),
    getInputRules: config.getInputRules || (() => []),
    getKeymap: config.getKeymap || (() => ({})),
  };
}
