import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { bulletListPlugin, isBulletListActive } from './bullet-list';
import { orderedListPlugin, isOrderedListActive } from './ordered-list';
import { codePlugin } from './code';
import { historyPlugin } from './history';
import { listItemPlugin } from './list-item';
import { BlockquotePlugin } from './blockquote';
import { blockquoteToolbarItem } from './blockquote-toolbar-item';
import { textColorPlugin } from './textColor';


export interface ToolbarItem {
  id: string;
  icon: string; // Or a React component, for now a string
  tooltip: string;
  command?: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
  onClick?: () => void;
  isActive?: (state: EditorState) => boolean;
  isVisible?: (state: EditorState) => boolean;
  type?: 'dropdown' | 'color-picker';
  children?: ToolbarItem[];
  onColorChange?: (color: string) => (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
}

export interface Plugin {
  name: string;
  nodes?: { [key: string]: any }; // Optional: Define custom nodes for the schema
  marks?: { [key: string]: any }; // Optional: Define custom marks for the schema
  getProseMirrorPlugins: (schema: Schema) => ProseMirrorPlugin[];
  getToolbarItems?: (schema: Schema) => ToolbarItem[]; // Optional method for toolbar items
}



export class PluginManager {
  private plugins: Plugin[] = [];
  private pluginRegistry: Map<string, Plugin> = new Map();

  registerPlugin(plugin: Plugin) {
    //console.log(`PluginManager: Registering plugin: ${plugin.name}`);
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
    //console.log("PluginManager: Getting nodes.");
    const nodes = this.plugins.reduce((nodes, plugin) => {
      if (plugin.nodes) {
        Object.assign(nodes, plugin.nodes);
      }
      return nodes;
    }, {
      blockquote: new BlockquotePlugin().nodes.blockquote,
    });
    //console.log("PluginManager: All collected nodes:", nodes);
    return nodes;
  }

  getToolbarItems(schema: Schema): Map<string, ToolbarItem> {
    //console.log(`PluginManager: Collecting toolbar items. Current plugins count: ${this.plugins.length}`);
    const toolbarItemMap = new Map<string, ToolbarItem>();
    this.plugins.forEach(plugin => {
      let items: ToolbarItem[] = [];
      if (plugin.getToolbarItems) {
        items = plugin.getToolbarItems(schema);
      }
      //console.log(`PluginManager: Plugin ${plugin.name} returned toolbar items:`, items);
      items.forEach(item => toolbarItemMap.set(item.id, item));
    });
    toolbarItemMap.set(blockquoteToolbarItem.id, blockquoteToolbarItem);
    //console.log(`PluginManager: Collected toolbar items:`, toolbarItemMap);
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
}