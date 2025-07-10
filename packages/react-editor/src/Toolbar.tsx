import React from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { ToolbarItem } from '@inkstream/editor-core';

interface ToolbarProps {
  editorState: EditorState | null;
  editorDispatch: ((tr: Transaction) => void) | null;
  editorView: EditorView | null;
  toolbarItems: ToolbarItem[];
}

export const Toolbar: React.FC<ToolbarProps> = ({ editorState, editorDispatch, editorView, toolbarItems }) => {
  const executeCommand = (command: ToolbarItem['command']) => {
    if (editorState && editorDispatch && editorView && command) {
      console.log("Executing command with editorView:", editorView);
      editorView.focus();
      command(editorState, editorDispatch, editorView);
    }
  };

  const renderToolbarItem = (item: ToolbarItem) => {
    if (item.type === 'color-picker') {
      return (
        <input
          key={item.id}
          type="color"
          className="inkstream-toolbar-color-picker"
          title={item.tooltip}
          onChange={(e) => {
            if (item.onColorChange && editorState && editorDispatch) {
              const command = item.onColorChange(e.target.value);
              command(editorState, editorDispatch);
            }
          }}
        />
      );
    } else if (item.type === 'dropdown' && item.children) {
      return (
        <div key={item.id} className="inkstream-toolbar-dropdown">
          <button
            className="inkstream-toolbar-button"
            title={item.tooltip}
          >
            {item.icon}
          </button>
          <div className="inkstream-toolbar-dropdown-content">
            {item.children.map(child => renderToolbarItem(child))}
          </div>
        </div>
      );
    } else {
      return (
        <button
          key={item.id}
          onClick={() => item.onClick ? item.onClick() : (item.command && executeCommand(item.command))}
          className={`inkstream-toolbar-button ${item.isActive && editorState && item.isActive(editorState) ? 'active' : ''}`}
          disabled={!editorState || !editorDispatch || !editorView || (item.isVisible && editorState && !item.isVisible(editorState)) || (!item.command && !item.onClick)}
          title={item.tooltip}
        >
          {item.icon}
        </button>
      );
    }
  };

  return (
    <div className="inkstream-toolbar">
      {toolbarItems.map(renderToolbarItem)}
    </div>
  );
};