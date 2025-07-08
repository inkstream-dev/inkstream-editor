import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Node } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';

interface ImageNodeViewProps {
  node: Node;
  view: EditorView;
  getPos: () => number;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ImageNodeView: React.FC<ImageNodeViewProps> = ({ node, view, getPos }) => {
  const [error, setError] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(node.attrs.src);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    // Update the node's src attribute when the local src state changes
    if (src && src !== node.attrs.src) {
      const tr = view.state.tr.setNodeMarkup(getPos(), undefined, {
        ...node.attrs,
        src: src,
      });
      view.dispatch(tr);
    }
  }, [src, node.attrs, view, getPos]);

  const handleFile = (file: File | null) => {
    if (!file) {
      setError('No file selected.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        setSrc(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imgRef.current) return;

    // Only allow resizing from the resize handle
    if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }

    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const initialWidth = imgRef.current.width;
    const initialHeight = imgRef.current.height;
    const aspectRatio = initialWidth / initialHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;

      let newWidth = initialWidth + dx;
      let newHeight = newWidth / aspectRatio;

      // Ensure minimum size
      newWidth = Math.max(20, newWidth);
      newHeight = Math.max(20, newHeight);

      if (imgRef.current) {
        imgRef.current.style.width = `${newWidth}px`;
        imgRef.current.style.height = `${newHeight}px`;
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      // Update ProseMirror node attributes only after resizing is complete
      if (imgRef.current) {
        const tr = view.state.tr.setNodeMarkup(getPos(), undefined, {
          ...node.attrs,
          width: imgRef.current.width,
          height: imgRef.current.height,
        });
        view.dispatch(tr);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [node.attrs, view, getPos]);

  if (src) {
    return (
      <div className="image-node-view-wrapper" contentEditable={false} ref={wrapperRef}>
        <img
          src={src}
          alt={node.attrs.alt}
          title={node.attrs.title}
          ref={imgRef}
          width={node.attrs.width || undefined}
          height={node.attrs.height || undefined}
        />
        <div className="resize-handle" onMouseDown={handleMouseDown}></div>
      </div>
    );
  }

  return (
    <div
      className="inkstream-image-upload-area"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
      contentEditable={false} // Prevent ProseMirror from trying to edit this div
    >
      <p>Drag & drop an image here, or click to select</p>
      <p>(Max file size: {MAX_FILE_SIZE_MB}MB)</p>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      {error && <p className="inkstream-error-message">{error}</p>}
    </div>
  );
};
