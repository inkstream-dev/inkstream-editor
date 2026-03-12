/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@inkstream/react-editor",
    "@inkstream/editor-core",
    "@inkstream/starter-kit",
    "@inkstream/heading",
    "@inkstream/font-family",
    "@inkstream/link-bubble",
    "@inkstream-dev/pro-plugins",
    "@inkstream/paragraph",
    "@inkstream/hard-break",
    "@inkstream/blockquote",
    "@inkstream/bold",
    "@inkstream/italic",
    "@inkstream/underline",
    "@inkstream/strike",
    "@inkstream/code",
    "@inkstream/alignment",
    "@inkstream/indent",
    "@inkstream/image",
    "@inkstream/horizontal-rule",
    "@inkstream/history",
    "@inkstream/text-color",
    "@inkstream/highlight",
    "@inkstream/code-block",
    "@inkstream/superscript",
    "@inkstream/subscript",
    "@inkstream/lists",
  ],
  reactStrictMode: false, // Disable StrictMode to prevent double-initialization of ProseMirror
  
  webpack: (config, { isServer }) => {
    // Ensure ProseMirror packages are treated as singletons to prevent duplicate instances
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'prosemirror-model': require.resolve('prosemirror-model'),
        'prosemirror-state': require.resolve('prosemirror-state'),
        'prosemirror-view': require.resolve('prosemirror-view'),
        'prosemirror-transform': require.resolve('prosemirror-transform'),
        'prosemirror-keymap': require.resolve('prosemirror-keymap'),
        'prosemirror-history': require.resolve('prosemirror-history'),
        'prosemirror-commands': require.resolve('prosemirror-commands'),
        'prosemirror-schema-list': require.resolve('prosemirror-schema-list'),
        'prosemirror-inputrules': require.resolve('prosemirror-inputrules'),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
