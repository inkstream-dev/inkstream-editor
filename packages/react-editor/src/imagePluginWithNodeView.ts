"use client";

import { imagePlugin } from '@inkstream/image';
import { ReactNodeViewRenderer } from './ReactNodeViewRenderer';
import { ImageNodeView } from './ImageNodeView';

/**
 * React-enhanced image plugin.
 *
 * Extends the framework-agnostic `imagePlugin` with a React node view that
 * provides drag-and-drop upload, file validation, and interactive resizing via
 * the `ImageNodeView` component.
 *
 * Use this plugin in place of the bare `imagePlugin` whenever the editor is
 * rendered inside a React application. The `RichTextEditor` component uses
 * this variant automatically in its default plugin set.
 *
 * ```tsx
 * import { imagePluginWithNodeView } from '@inkstream/react-editor';
 *
 * <RichTextEditor plugins={[..., imagePluginWithNodeView]} />
 * ```
 */
export const imagePluginWithNodeView = imagePlugin.extend({
  name: 'image',
  addNodeViews: () => ({
    // wrapperClass is applied to the outer NodeView container (dom).
    // ProseMirror adds ProseMirror-selectednode to this element, so we
    // need the class to write correct CSS selectors for selection styling.
    image: ReactNodeViewRenderer(ImageNodeView, { wrapperClass: 'inkstream-image-nodeview' }),
  }),
});
