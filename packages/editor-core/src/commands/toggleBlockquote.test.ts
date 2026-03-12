import { EditorState } from '@inkstream/pm/state';
import { toggleBlockquote } from '@inkstream/blockquote';
import { inkstreamSchema, PluginManager } from '../index';
import { availablePlugins } from '@inkstream/starter-kit';

describe('toggleBlockquote', () => {
  const pluginManager = new PluginManager();
  Object.values(availablePlugins).forEach(plugin => pluginManager.registerPlugin(plugin));
  const schema = inkstreamSchema(pluginManager);
  const { nodes, marks } = schema.spec;

  it('should wrap a paragraph in a blockquote', () => {
    const state = EditorState.create({
      schema,
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, [schema.text('Hello world')]),
      ]),
    });
    let tr = state.tr;
    toggleBlockquote(state, (t) => (tr = t));
    const expectedDoc = schema.node('doc', null, [
      schema.node('blockquote', null, [
        schema.node('paragraph', null, [schema.text('Hello world')]),
      ]),
    ]);
    expect(tr.doc).toEqual(expectedDoc);
  });

  it('should unwrap a blockquote into a paragraph', () => {
    const state = EditorState.create({
      schema,
      doc: schema.node('doc', null, [
        schema.node('blockquote', null, [
          schema.node('paragraph', null, [schema.text('Hello world')]),
        ]),
      ]),
    });
    let tr = state.tr;
    toggleBlockquote(state, (t) => (tr = t));
    const expectedDoc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('Hello world')]),
    ]);
    expect(tr.doc).toEqual(expectedDoc);
  });
});
