import React from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { toggleMark } from 'prosemirror-commands';
import { EditorView } from 'prosemirror-view';

interface ToolbarProps {
  editorState: EditorState | null;
  editorDispatch: ((tr: Transaction) => void) | null;
  editorView: EditorView | null; // Add editorView to props
}

export const Toolbar: React.FC<ToolbarProps> = ({ editorState, editorDispatch, editorView }) => {
  const applyMark = (markType: any) => {
    if (editorState && editorDispatch && editorView) {
      editorView.focus(); // Ensure editor has focus and updated selection
      toggleMark(markType)(editorState, editorDispatch);
    }
  };

  return (
    <div className="inkstream-toolbar">
      <button
        onClick={() => applyMark(editorState?.schema.marks.strong)}
        className="inkstream-toolbar-button"
        disabled={!editorState || !editorDispatch || !editorView}
      >
        B
      </button>
    </div>
  );
};