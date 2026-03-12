"use client";

import React from 'react';
import { createRoot } from 'react-dom/client';
import { NodeViewConstructor } from '@inkstream/editor-core';

/**
 * Props that every React component used as a NodeView must accept.
 * The component will be remounted (via `root.render`) whenever the
 * ProseMirror node's attributes change.
 */
export interface NodeViewComponentProps {
  /** The current ProseMirror node being rendered. */
  node: any;
  /** The live EditorView — use to dispatch transactions (e.g. `view.dispatch`). */
  view: any;
  /**
   * Returns the document position of the node's start, or `undefined` when
   * the node has been removed from the document.
   */
  getPos: () => number | undefined;
}

export interface ReactNodeViewRendererOptions {
  /**
   * CSS class added to the container `<div>` that wraps the React root.
   * Useful for targeting the wrapper with CSS without hard-coding a class
   * in the component itself.
   */
  wrapperClass?: string;
}

/**
 * Wraps a React component as a ProseMirror `NodeViewConstructor`.
 *
 * The returned constructor mounts the component into a `<div>` container
 * using React 18's `createRoot`, implements `update()` by re-rendering with
 * new props, and implements `destroy()` by unmounting the root.
 *
 * **Usage inside `createPlugin`:**
 * ```ts
 * import { imagePlugin } from '@inkstream/image';
 * import { ReactNodeViewRenderer } from '@inkstream/react-editor';
 * import { ImageNodeView } from './ImageNodeView';
 *
 * export const imagePluginWithNodeView = imagePlugin.extend({
 *   name: 'image',
 *   addNodeViews: () => ({
 *     image: ReactNodeViewRenderer(ImageNodeView),
 *   }),
 * });
 * ```
 *
 * @param Component - A React component accepting `NodeViewComponentProps`.
 * @param options   - Optional configuration (e.g. `wrapperClass`).
 * @returns A ProseMirror `NodeViewConstructor` compatible with
 *          `EditorView`'s `nodeViews` option.
 */
export function ReactNodeViewRenderer(
  Component: React.ComponentType<NodeViewComponentProps>,
  options: ReactNodeViewRendererOptions = {},
): NodeViewConstructor {
  return (node, view, getPos) => {
    const dom = document.createElement('div');
    if (options.wrapperClass) dom.classList.add(options.wrapperClass);

    const root = createRoot(dom);

    const render = (currentNode: typeof node) => {
      root.render(
        React.createElement(Component, { node: currentNode, view, getPos }),
      );
    };

    render(node);

    return {
      dom,
      update(newNode) {
        // Reject updates for a different node type — ProseMirror convention.
        if (newNode.type !== node.type) return false;
        // Re-render with fresh node (new attrs / content).
        render(newNode);
        return true;
      },
      destroy() {
        root.unmount();
      },
    };
  };
}
