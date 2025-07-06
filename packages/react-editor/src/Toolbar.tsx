import React from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { ToolbarItem } from '@inkstream/editor-core/src/plugins';

interface ToolbarProps {
  editorState: EditorState | null;
  editorDispatch: ((tr: Transaction) => void) | null;
  editorView: EditorView | null;
  toolbarItems: ToolbarItem[];
}

export const Toolbar: React.FC<ToolbarProps> = ({ editorState, editorDispatch, editorView, toolbarItems }) => {
  console.log("Toolbar rendering with items:", toolbarItems); // Log received toolbar items

  const executeCommand = (command: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean) => {
    if (editorState && editorDispatch && editorView) {
      editorView.focus();
      command(editorState, editorDispatch);
    }
  };

  return (
    <div className="inkstream-toolbar">
      {toolbarItems.map((item) => (
        <button
          key={item.id}
          onClick={() => executeCommand(item.command)}
          className={`inkstream-toolbar-button ${item.isActive && editorState && item.isActive(editorState) ? 'active' : ''}`}
          disabled={!editorState || !editorDispatch || !editorView || (item.isVisible && editorState && !item.isVisible(editorState))}
          title={item.tooltip}
        >
          {item.icon}
        </button>bo
      ))}
    </div>
  );
};