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

  /**
   * Renders a list of dropdown children.
   * When layout === 'grid', contiguous non-separator palette swatches are
   * rendered in a compact 8-column colour grid; everything else (last-used
   * row, separators, custom picker) renders as a normal list.
   */
  const renderDropdownChildren = (
    children: (ToolbarItem | string)[],
    layout: ToolbarItem['childrenLayout'] | undefined,
    depth: number,
  ) => {
    if (layout !== 'grid') {
      return children.map((child, i) => renderToolbarItem(child, i, depth));
    }

    // Split into segments: pre-grid (last-used + separator), grid swatches, post-grid
    const isSwatch = (child: ToolbarItem | string) =>
      typeof child === 'object' &&
      !child.id?.includes('sep') &&
      !child.id?.includes('last-used') &&
      child.type !== 'color-picker';

    const preGrid: (ToolbarItem | string)[] = [];
    const swatches: (ToolbarItem | string)[] = [];
    const postGrid: (ToolbarItem | string)[] = [];

    let phase: 'pre' | 'grid' | 'post' = 'pre';
    for (const child of children) {
      if (phase === 'pre' && isSwatch(child)) phase = 'grid';
      else if (phase === 'grid' && !isSwatch(child)) phase = 'post';

      if (phase === 'pre') preGrid.push(child);
      else if (phase === 'grid') swatches.push(child);
      else postGrid.push(child);
    }

    return (
      <>
        {preGrid.map((child, i) => renderToolbarItem(child, i, depth))}
        {swatches.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, padding: '6px 8px' }}>
            {swatches.map((child, i) => renderToolbarItem(child, i, depth))}
          </div>
        )}
        {postGrid.map((child, i) => renderToolbarItem(child, i + swatches.length, depth))}
      </>
    );
  };

  const renderToolbarItem = (item: ToolbarItem | string, index: number, depth = 0) => {
    if (typeof item === 'string' && item === '|') {
      return <div key={`separator-${index}`} className="inkstream-toolbar-separator" />;
    } else if (typeof item === 'object') {
      // Separator ToolbarItem convention (id contains 'sep' and no command/children)
      if (item.icon === '|') {
        return <div key={item.id ?? `sep-${index}`} className="inkstream-toolbar-separator" />;
      }
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
      } else if (item.type === 'dropdown' && (item.children || item.getChildren)) {
        // Resolve children: prefer dynamic getChildren over static children
        const resolvedChildren = item.getChildren && editorState
          ? item.getChildren(editorState)
          : (item.children ?? []);

        const isOpen = openDropdown === item.id || openNested === item.id;
        const isNested = depth > 0;

        // Active color for the color indicator bar on the button
        const activeColor = item.getActiveColor && editorState
          ? item.getActiveColor(editorState)
          : null;

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
                <span style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                  {item.iconHtml
                    ? <span style={item.iconStyle} dangerouslySetInnerHTML={{ __html: item.iconHtml }} />
                    : <span style={item.iconStyle}>{item.icon}</span>
                  }
                  {activeColor && (
                    <span style={{ display: 'block', height: 2, width: '100%', background: activeColor, borderRadius: 1 }} />
                  )}
                </span>
              </button>
              {isOpen && (
                <div 
                  className="inkstream-toolbar-dropdown-content nested"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderDropdownChildren(resolvedChildren, item.childrenLayout, depth + 1)}
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
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPosition({
                      top: rect.bottom + 5,
                      left: rect.left
                    });
                  }
                }
              }}
            >
              <span style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                {item.iconHtml
                  ? <span style={item.iconStyle} dangerouslySetInnerHTML={{ __html: item.iconHtml }} />
                  : <span style={item.iconStyle}>{item.icon}</span>
                }
                {activeColor && (
                  <span style={{ display: 'block', height: 2, width: '100%', background: activeColor, borderRadius: 1 }} />
                )}
              </span>
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
                  setOpenNested(null);
                }}
              >
                {renderDropdownChildren(resolvedChildren, item.childrenLayout, depth + 1)}
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
            className={`inkstream-toolbar-button ${item.isActive && editorState && item.isActive(editorState) ? 'active' : ''} ${depth > 0 && item.label ? 'inkstream-toolbar-menu-item' : ''}`}
            disabled={!editorState || !editorDispatch || !editorView || (!item.command && !item.onClick)}
            title={item.tooltip}
          >
            {depth > 0 && item.label ? (
              <span className="inkstream-toolbar-menu-item-inner">
                {item.iconHtml
                  ? <span dangerouslySetInnerHTML={{ __html: item.iconHtml }} />
                  : <span style={item.iconStyle}>{item.icon}</span>
                }
                <span className="inkstream-toolbar-menu-label">{item.label}</span>
              </span>
            ) : (
              <span style={item.iconStyle}>
                {item.iconHtml
                  ? <span dangerouslySetInnerHTML={{ __html: item.iconHtml }} />
                  : item.icon
                }
              </span>
            )}
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
