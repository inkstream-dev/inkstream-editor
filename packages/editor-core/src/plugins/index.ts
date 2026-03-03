import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { InputRule } from 'prosemirror-inputrules';
import { bulletListPlugin, isBulletListActive } from './bullet-list';
import { orderedListPlugin, isOrderedListActive } from './ordered-list';
import { codePlugin } from './code';
import { historyPlugin } from './history';
import { listItemPlugin } from './list-item';
import { textColorPlugin } from './textColor';
import { highlightPlugin } from './highlight';
import { codeBlockPlugin } from './codeBlock';
import { PluginTier } from '../license';


export interface ToolbarItem {
  id: string;
  icon: string; // Or a React component, for now a string
  tooltip: string;
  command?: (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => boolean;
  onClick?: () => void;
  isActive?: (state: EditorState) => boolean;
  isVisible?: (state: EditorState) => boolean;
  type?: 'dropdown' | 'color-picker';
  children?: ToolbarItem[];
  onColorChange?: (color: string) => (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
  /** Optional inline style applied to the icon element (e.g. colored swatch). */
  iconStyle?: Record<string, string>;
  /** When set, overrides `children` with a dynamic list computed from live editor state. */
  getChildren?: (state: EditorState) => ToolbarItem[];
  /** Returns the currently active color for this item (used to render a color indicator). */
  getActiveColor?: (state: EditorState) => string | null;
  /** When 'grid', children are rendered in a compact color-swatch grid instead of a list. */
  childrenLayout?: 'grid';
}

export interface Plugin {
  name: string;
  tier?: PluginTier; // Plugin tier - defaults to 'free' if not specified
  description?: string; // Description of the plugin
  nodes?: { [key: string]: any }; // Optional: Define custom nodes for the schema
  marks?: { [key: string]: any }; // Optional: Define custom marks for the schema
  getProseMirrorPlugins?: (schema: Schema) => ProseMirrorPlugin[];
  getToolbarItems?: (schema: Schema, options?: any) => ToolbarItem[]; // Optional method for toolbar items with options
  getInputRules?: (schema: Schema) => InputRule[];
  getKeymap?: (schema: Schema) => { [key: string]: any };
}



export class PluginManager {
  private plugins: Plugin[] = [];
  private pluginRegistry: Map<string, Plugin> = new Map();

  registerPlugin(plugin: Plugin) {
    this.plugins.push(plugin);
    this.pluginRegistry.set(plugin.name, plugin);
    // console.log(`PluginManager: After registration, plugins count: ${this.plugins.length}`);
  }

  clearPlugins() {
    //console.log("PluginManager: Clearing plugins...");
    this.plugins = [];
    this.pluginRegistry.clear();
    //console.log(`PluginManager: After clearing, plugins count: ${this.plugins.length}`);
  }

  getProseMirrorPlugins(schema: Schema): ProseMirrorPlugin[] {
    //console.log("PluginManager: Getting ProseMirror plugins for schema:", schema);
    const pmPlugins = this.plugins.flatMap(plugin => {
      const plugins = plugin.getProseMirrorPlugins ? plugin.getProseMirrorPlugins(schema) : [];
      // console.log(`PluginManager: Plugin ${plugin.name} returned ProseMirror plugins:`, plugins);
      return plugins;
    });
   // console.log("PluginManager: All collected ProseMirror plugins:", pmPlugins);
    return pmPlugins;
  }

  getNodes(): { [key: string]: any } {
    const nodes = this.plugins.reduce((nodes, plugin) => {
      if (plugin.nodes) {
        Object.assign(nodes, plugin.nodes);
      }
      return nodes;
    }, {} as { [key: string]: any });
    return nodes;
  }

  getToolbarItems(schema: Schema, pluginOptions: { [key: string]: any } = {}): Map<string, ToolbarItem> {
    const toolbarItemMap = new Map<string, ToolbarItem>();
    this.plugins.forEach(plugin => {
      let items: ToolbarItem[] = [];
      if (plugin.getToolbarItems) {
        const options = pluginOptions[plugin.name] || {};
        items = plugin.getToolbarItems(schema, options);
      }
      items.forEach(item => toolbarItemMap.set(item.id, item));
    });
    return toolbarItemMap;
  }

  getMarks(): { [key: string]: any } {
    return this.plugins.reduce((marks, plugin) => {
      if (plugin.marks) {
        Object.assign(marks, plugin.marks);
      }
      return marks;
    }, {});
  }

  getPlugin(name: string): Plugin | undefined {
    return this.pluginRegistry.get(name);
  }

  getPlugins(): Plugin[] {
    return Array.from(this.pluginRegistry.values());
  }
}