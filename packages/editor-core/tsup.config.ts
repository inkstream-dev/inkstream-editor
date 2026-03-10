import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],

  // Produce both CommonJS (dist/index.js) and ESM (dist/index.mjs)
  format: ['cjs', 'esm'],

  // Generate TypeScript declarations alongside the bundles
  dts: true,

  clean: true,
  sourcemap: true,

  target: 'es2017',

  // Do NOT bundle ProseMirror or any @inkstream packages.
  // Consumers bring their own copies via peerDependencies so there is
  // exactly one instance of each ProseMirror class at runtime.
  external: [
    /^prosemirror-.*/,
    /^@inkstream\/.*/,
  ],
})
