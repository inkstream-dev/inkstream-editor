import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';

export interface Plugin {
  name: string;
  getProseMirrorPlugins: (schema: Schema) => ProseMirrorPlugin[];
}

export class PluginManager {
  private plugins: Plugin[] = [];

  registerPlugin(plugin: Plugin) {
    this.plugins.push(plugin);
  }

  getProseMirrorPlugins(schema: Schema): ProseMirrorPlugin[] {
    return this.plugins.flatMap(plugin => plugin.getProseMirrorPlugins(schema));
  }
}
