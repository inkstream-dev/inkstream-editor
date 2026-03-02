import React, { useState, useRef, useEffect } from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { ToolbarItem } from '@inkstream/editor-core';

interface ToolbarProps {
  editorState: EditorState | null;
  editorDispatch: ((tr: Transaction) => void) | null;
  editorView: EditorView | null;
  toolbarItems: (ToolbarItem | string)[];
}

export const Toolbar: React.FC<ToolbarProps> = ({ editorState, editorDispatch, editorView, toolbarItems }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openNested, setOpenNested] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      let isInside = false;
      
      dropdownRefs.current.forEach(ref => {
        if (ref && ref.contains(target)) {
          isInside = true;
        }
      });

      buttonRefs.current.forEach(ref => {
        if (ref && ref.contains(target)) {
          isInside = true;
        }
      });

      if (!isInside) {
        setOpenDropdown(null);
        setOpenNested(null);
      }
    };

    // Close on escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setOpenNested(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const executeCommand = (command: ToolbarItem['command']) => {
    if (editorState && editorDispatch && editorView && command) {
      console.log("Executing command with editorView:", editorView);
      editorView.focus();
      command(editorState, editorDispatch, editorView);
      setOpenDropdown(null); // Close dropdown after command
    }
  };

  const renderToolbarItem = (item: ToolbarItem | string, index: number, depth = 0) => {
    if (typeof item === 'string' && item === '|') {
      return <div key={`separator-${index}`} className="inkstream-toolbar-separator" />;
    } else if (typeof item === 'object') {
      // Check visibility
      if (item.isVisible && editorState && !item.isVisible(editorState)) {
        return null;
      }

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
        const isOpen = openDropdown === item.id || openNested === item.id;
        const isNested = depth > 0;

        if (isNested) {
          // Nested dropdown (submenu inside bubble menu)
          return (
            <div 
              key={item.id}
              className="inkstream-toolbar-dropdown"
            >
              <button
                className={`inkstream-toolbar-button ${isOpen ? 'active' : ''}`}
                title={item.tooltip}
                onMouseEnter={() => setOpenNested(item.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setOpenNested(isOpen ? null : item.id);
                }}
              >
                {item.icon}
              </button>
              {isOpen && (
                <div 
                  className="inkstream-toolbar-dropdown-content nested"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.children.map((child, childIndex) => 
                    renderToolbarItem(child, childIndex, depth + 1)
                  )}
                </div>
              )}
            </div>
          );
        }

        // Top-level dropdown (main bubble menu)
        return (
          <React.Fragment key={item.id}>
            <button
              ref={(ref) => {
                if (ref) buttonRefs.current.set(item.id, ref);
              }}
              className={`inkstream-toolbar-button ${isOpen ? 'active' : ''}`}
              title={item.tooltip}
              onClick={(e) => {
                e.stopPropagation();
                if (item.onClick) {
                  item.onClick();
                  setOpenDropdown(null);
                } else {
                  if (isOpen) {
                    setOpenDropdown(null);
                  } else {
                    setOpenDropdown(item.id);
                    // Calculate position for bubble menu
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPosition({
                      top: rect.bottom + 5,
                      left: rect.left
                    });
                  }
                }
              }}
            >
              {item.icon}
            </button>
            {isOpen && (
              <div 
                ref={(ref) => {
                  if (ref) dropdownRefs.current.set(item.id, ref);
                }}
                className="inkstream-toolbar-bubble-menu"
                style={{
                  position: 'fixed',
                  top: dropdownPosition?.top || 0,
                  left: dropdownPosition?.left || 0,
                  zIndex: 9999,
                }}
                onMouseLeave={() => {
                  // Close nested menu when leaving the bubble menu
                  setOpenNested(null);
                }}
              >
                {item.children.map((child, childIndex) => 
                  renderToolbarItem(child, childIndex, depth + 1)
                )}
              </div>
            )}
          </React.Fragment>
        );
      } else {
        return (
          <button
            key={item.id}
            onClick={(e) => {
              e.stopPropagation();
              if (item.onClick) {
                item.onClick();
                setOpenDropdown(null);
              } else if (item.command) {
                executeCommand(item.command);
              }
            }}
            className={`inkstream-toolbar-button ${item.isActive && editorState && item.isActive(editorState) ? 'active' : ''}`}
            disabled={!editorState || !editorDispatch || !editorView || (!item.command && !item.onClick)}
            title={item.tooltip}
          >
            {item.icon}
          </button>
        );
      }
    } else {
      return <div key={`separator-${index}`} className="inkstream-toolbar-separator" />;
    }
  };

  return (
    <div className="inkstream-toolbar">
      {toolbarItems.map((item, index) => renderToolbarItem(item, index))}
    </div>
  );
};
