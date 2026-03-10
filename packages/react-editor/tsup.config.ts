import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.tsx'],

  // Produce both CommonJS (dist/index.js) and ESM (dist/index.mjs)
  format: ['cjs', 'esm'],

  // Generate TypeScript declarations alongside the bundles
  dts: true,

  // Inline editor.css into the JS bundle as a style-injection snippet.
  // When the module is imported in the browser, a <style> tag is appended
  // to <head> automatically — no manual CSS import needed by consumers.
  injectStyle: true,

  // Remove previous dist on every build
  clean: true,

  sourcemap: true,

  // Do NOT bundle these. react/react-dom are peerDeps (provided by consumers).
  // @inkstream/* packages are regular dependencies (auto-installed) but kept
  // external so each ships as a standalone module — pnpm deduplication then
  // ensures a single shared instance of ProseMirror at runtime.
  external: [
    'react',
    'react-dom',
    '@inkstream/editor-core',
    '@inkstream/link-bubble',
    'prosemirror-state',
    'prosemirror-view',
    'prosemirror-model',
    'prosemirror-transform',
    'prosemirror-commands',
    'prosemirror-history',
    'prosemirror-inputrules',
    'prosemirror-keymap',
    'prosemirror-schema-list',
    'prosemirror-utils',
  ],

  // Preserve the "use client" directive so Next.js App Router knows this
  // is a client-only module and renders the component boundary correctly.
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    }
  },
})
