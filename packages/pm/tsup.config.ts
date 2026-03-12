import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    model: 'src/model.ts',
    state: 'src/state.ts',
    view: 'src/view.ts',
    commands: 'src/commands.ts',
    keymap: 'src/keymap.ts',
    inputrules: 'src/inputrules.ts',
    history: 'src/history.ts',
    'schema-list': 'src/schema-list.ts',
    transform: 'src/transform.ts',
    utils: 'src/utils.ts',
    tables: 'src/tables.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2017',
  // Keep prosemirror-* as external — they are dependencies that install
  // alongside this package; we re-export them without bundling so that
  // the consumer's module graph contains exactly ONE copy of each PM package.
  external: [/^prosemirror-.*/],
})
