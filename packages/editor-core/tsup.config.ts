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

  // Do NOT bundle ProseMirror or any @inkstream packages — even though
  // prosemirror-* are listed as dependencies (so pnpm installs them
  // alongside editor-core), we keep them external in the build so that
  // pnpm's deduplication can ensure exactly one shared instance at runtime.
  // This prevents the "multiple versions of prosemirror-model" class-identity
  // failures that ProseMirror's instanceof checks would otherwise trigger.
  external: [
    /^prosemirror-.*/,
    /^@inkstream\/.*/,
  ],
})
