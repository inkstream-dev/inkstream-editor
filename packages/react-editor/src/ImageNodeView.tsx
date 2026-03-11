"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Node } from '@inkstream/pm/model';
import { EditorView } from '@inkstream/pm/view';

interface ImageNodeViewProps {
  node: Node;
  view: EditorView;
  getPos: () => number | undefined;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Explicit allowlist — avoids false positives from exotic MIME types
const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif',
  'image/webp', 'image/svg+xml', 'image/avif',
]);

export const ImageNodeView: React.FC<ImageNodeViewProps> = ({ node, view, getPos }) => {
  const [src, setSrc] = useState<string | null>(node.attrs.src ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // Guard against callbacks firing after unmount (FileReader, resize listeners)
  const mountedRef = useRef(true);
  // Stores cleanup fn for resize listeners so unmount can remove them
  const cleanupResizeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanupResizeRef.current?.();
    };
  }, []);

  // Sync node attribute changes (undo/redo, external setNodeMarkup) to local state.
  // This is separate from the upload dispatch flow to avoid circular updates.
  useEffect(() => {
    setSrc(node.attrs.src ?? null);
  }, [node.attrs.src]);

  // Dispatch a src update into the ProseMirror document.
  const dispatchSrc = useCallback((newSrc: string) => {
    const pos = getPos();
    if (pos === undefined) return;
    view.dispatch(
      view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: newSrc })
    );
  }, [view, getPos, node.attrs]);

  const handleFile = useCallback((file: File | null) => {
    if (!file) {
      setError('No file selected.');
      return;
    }
    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      setError(`Unsupported type "${file.type || 'unknown'}". Use PNG, JPG, GIF, WebP, or SVG.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File exceeds the ${MAX_FILE_SIZE_MB} MB limit.`);
      return;
    }

    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!mountedRef.current) return; // Component unmounted — discard result
      const dataUrl = e.target?.result as string | undefined;
      if (!dataUrl) return;
      setSrc(dataUrl);      // Optimistic update: show image immediately
      dispatchSrc(dataUrl); // Persist to ProseMirror document
    };

    reader.onerror = () => {
      if (!mountedRef.current) return;
      setError('Failed to read file. Please try again.');
    };

    reader.readAsDataURL(file);
  }, [dispatchSrc]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
    // Reset so the same file can be re-selected without a second click
    e.target.value = '';
  }, [handleFile]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!imgRef.current) return;

    const startX = e.clientX;
    // Use offsetWidth/offsetHeight for CSS-rendered dimensions (not the HTML attribute)
    const initialWidth = imgRef.current.offsetWidth;
    const initialHeight = imgRef.current.offsetHeight;
    // Guard against zero height (image not yet loaded) to prevent division by zero
    const aspectRatio = initialHeight > 0 ? initialWidth / initialHeight : 1;

    const onMouseMove = (ev: MouseEvent) => {
      if (!imgRef.current) return;
      const newWidth = Math.max(40, initialWidth + (ev.clientX - startX));
      const newHeight = Math.round(newWidth / aspectRatio);
      imgRef.current.style.width = `${newWidth}px`;
      imgRef.current.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
      cleanup();
      if (!imgRef.current) return;
      const pos = getPos();
      if (pos === undefined) return;
      view.dispatch(
        view.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          width: imgRef.current.offsetWidth,
          height: imgRef.current.offsetHeight,
        })
      );
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cleanupResizeRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    // Store so unmount can remove listeners if resize is interrupted
    cleanupResizeRef.current = cleanup;
  }, [node.attrs, view, getPos]);

  if (src) {
    return (
      <div className="image-node-view-wrapper" contentEditable={false}>
        <img
          ref={imgRef}
          src={src}
          alt={node.attrs.alt ?? ''}
          title={node.attrs.title ?? undefined}
          width={node.attrs.width ?? undefined}
          height={node.attrs.height ?? undefined}
          loading="lazy"
          draggable={false}
        />
        <div
          className="resize-handle"
          onMouseDown={handleResizeMouseDown}
          aria-label="Resize image"
        />
      </div>
    );
  }

  return (
    <div
      className={`inkstream-image-upload-area${isDragOver ? ' inkstream-image-upload-area--dragover' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      contentEditable={false}
      role="button"
      tabIndex={0}
      aria-label="Upload image — click or drag and drop"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
    >
      <svg
        className="inkstream-upload-icon"
        viewBox="0 0 24 24" width="32" height="32"
        fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M3 15.5l5-5.5 4 4 3-3.5 6 6.5"/>
      </svg>
      <p className="inkstream-upload-text">
        Drag & drop or <span>click to upload</span>
      </p>
      <p className="inkstream-upload-hint">
        PNG, JPG, GIF, WebP · Max {MAX_FILE_SIZE_MB} MB
      </p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />
      {error && (
        <p className="inkstream-error-message" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
};
