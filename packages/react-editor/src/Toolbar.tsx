import React from 'react';
import { EditorView } from 'prosemirror-view';
import { toggleMark } from 'prosemirror-commands';

interface ToolbarProps {
  view: EditorView;
}

export const Toolbar: React.FC<ToolbarProps> = ({ view }) => {
  const applyMark = (markType: any) => {
    const { state, dispatch } = view;
    toggleMark(markType)(state, dispatch);
  };

  return (
    <div className="inkstream-toolbar">
      <button
        onClick={() => applyMark(view.state.schema.marks.strong)}
        className="inkstream-toolbar-button"
      >
        B
      </button>
    </div>
  );
};
