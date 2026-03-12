import { Schema } from '@inkstream/pm/model';
import { PluginManager } from './plugins';
import { applyGlobalAttributes } from './global-attributes';

/**
 * Builds the ProseMirror schema from the registered plugins.
 *
 * Core schema defines only the two structural primitives every ProseMirror
 * document must have (`doc` and `text`). All other nodes and marks are
 * contributed by plugins registered in the PluginManager.
 *
 * Global attributes declared via `addGlobalAttributes()` are merged into
 * the relevant node/mark specs before the Schema is constructed.
 */
export const inkstreamSchema = (manager: PluginManager) => {
  const rawNodes = {
    doc: { content: 'block+', toDOM() { return ['div', 0]; } },
    text: { inline: true, group: 'inline', toDOM(node: any) { return node.text || ''; } },
    ...manager.getNodes(),
  };

  const rawMarks = manager.getMarks();
  const globalAttrDefs = manager.getGlobalAttributes();

  const { nodes, marks } = applyGlobalAttributes(rawNodes, rawMarks, globalAttrDefs);

  return new Schema({ nodes, marks });
};
