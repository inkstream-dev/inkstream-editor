import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from 'prosemirror-state';

export interface ToolbarItem {
  id: string;
  icon: string; // Or a React component, for now a string
  tooltip: string;
  command: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
  isActive?: (state: EditorState) => boolean;
  isVisible?: (state: EditorState) => boolean;
}

export interface Plugin {
  name: string;
  getProseMirrorPlugins: (schema: Schema) => ProseMirrorPlugin[];
  getToolbarItems?: (schema: Schema) => ToolbarItem[]; // Optional method for toolbar items
}

export class PluginManager {
  private plugins: Plugin[] = [];
  private pluginRegistry: Map<string, Plugin> = new Map();

  registerPlugin(plugin: Plugin) {
    console.log(`PluginManager: Registering plugin: ${plugin.name}`);
    this.plugins.push(plugin);
    this.pluginRegistry.set(plugin.name, plugin);
    console.log(`PluginManager: After registration, plugins count: ${this.plugins.length}`);
  }

  clearPlugins() {
    console.log("PluginManager: Clearing plugins...");
    this.plugins = [];
    this.pluginRegistry.clear();
    console.log(`PluginManager: After clearing, plugins count: ${this.plugins.length}`);
  }

  getProseMirrorPlugins(schema: Schema): ProseMirrorPlugin[] {
    return this.plugins.flatMap(plugin => plugin.getProseMirrorPlugins(schema));
  }

  getToolbarItems(schema: Schema): ToolbarItem[] {
    console.log(`PluginManager: Collecting toolbar items. Current plugins count: ${this.plugins.length}`);
    return this.plugins.flatMap(plugin => {
      const items = plugin.getToolbarItems ? plugin.getToolbarItems(schema) : [];
      console.log(`PluginManager: Plugin ${plugin.name} toolbar items:`, items);
      return items;
    });
  }

  getPlugin(name: string): Plugin | undefined {
    return this.pluginRegistry.get(name);
  }
}