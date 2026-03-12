import { Schema } from '@inkstream/pm/model';
import { PluginManager } from './plugins';

/**
 * Builds the ProseMirror schema from the registered plugins.
 *
 * Core schema defines only the two structural primitives every ProseMirror
 * document must have (`doc` and `text`). All other nodes and marks are
 * contributed by plugins registered in the PluginManager.
 */
export const inkstreamSchema = (manager: PluginManager) => new Schema({
  nodes: {
    doc: { content: 'block+', toDOM() { return ['div', 0]; } },
    text: { inline: true, group: 'inline', toDOM(node) { return node.text || ''; } },

    ...manager.getNodes(),
  },

  marks: {
    ...manager.getMarks(),
  },
});
