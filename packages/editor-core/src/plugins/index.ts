import { Schema } from '@inkstream/pm/model';
import { Plugin as ProseMirrorPlugin, EditorState, Transaction } from '@inkstream/pm/state';
import { EditorView } from '@inkstream/pm/view';
import { InputRule } from '@inkstream/pm/inputrules';
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
  icon?: string; // Or a React component, for now a string (optional when iconHtml is used)
  tooltip: string;
  command?: (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => boolean;
  onClick?: () => void;
  isActive?: (state: EditorState) => boolean;
  isVisible?: (state: EditorState) => boolean;
  /** When provided, returns false → button is rendered disabled. Use for commands
   *  that are only meaningful in certain states (e.g. undo when history is empty). */
  isEnabled?: (state: EditorState) => boolean;
  type?: 'dropdown' | 'color-picker' | 'label';
  children?: ToolbarItem[];
  onColorChange?: (color: string) => (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
  /** When set, rendered as raw HTML inside the icon span (allows inline SVG icons). */
  iconHtml?: string;
  /** Optional text label shown alongside the icon when item is inside a dropdown (depth > 0). */
  label?: string;
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
  tier?: PluginTier;
  description?: string;
  nodes?: { [key: string]: any };
  marks?: { [key: string]: any };
  /** Default options resolved from `addOptions()` at plugin creation time. */
  defaultOptions?: unknown;
  getProseMirrorPlugins?: (schema: Schema) => ProseMirrorPlugin[];
  /** Receives the resolved options (defaults merged with user overrides). */
  getToolbarItems?: (schema: Schema, options?: Record<string, unknown>) => ToolbarItem[];
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

  getToolbarItems(schema: Schema, pluginOptions: { [key: string]: Record<string, unknown> } = {}): Map<string, ToolbarItem> {
    const toolbarItemMap = new Map<string, ToolbarItem>();
    this.plugins.forEach(plugin => {
      let items: ToolbarItem[] = [];
      if (plugin.getToolbarItems) {
        // Merge plugin defaults with user-provided overrides so the plugin
        // receives a fully resolved options object.
        const userOptions = pluginOptions[plugin.name] || {};
        const options = { ...(plugin.defaultOptions as Record<string, unknown> || {}), ...userOptions };
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