"use client";

import React, {
  useState, useRef, useEffect, useCallback, useMemo,
  createContext, useContext, memo,
} from 'react';
import { EditorView } from '@inkstream/pm/view';
import { ToolbarItem } from '@inkstream/editor-core';
import { EditorStateStore, useEditorState } from './useEditorState';
import type { ThemeMode } from './index';

// ── Theme Toggle ──────────────────────────────────────────────────────────────

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const MonitorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

const THEME_OPTIONS: { value: ThemeMode; label: string; Icon: React.FC }[] = [
  { value: 'auto',  label: 'Auto (system)', Icon: MonitorIcon },
  { value: 'light', label: 'Light',         Icon: SunIcon },
  { value: 'dark',  label: 'Dark',          Icon: MoonIcon },
];

interface ThemeToggleProps {
  currentTheme: ThemeMode;
  onChange: (theme: ThemeMode) => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ currentTheme, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const current = THEME_OPTIONS.find(o => o.value === currentTheme)!;

  return (
    <div ref={containerRef} className="inkstream-theme-toggle">
      <button
        className={`inkstream-toolbar-button inkstream-theme-toggle-btn${open ? ' active' : ''}`}
        title={`Theme: ${current.label}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <current.Icon />
      </button>
      {open && (
        <div className="inkstream-theme-dropdown" role="listbox" aria-label="Select theme">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              role="option"
              aria-selected={currentTheme === value}
              className={`inkstream-theme-option${currentTheme === value ? ' active' : ''}`}
              onClick={() => { onChange(value); setOpen(false); }}
            >
              <Icon />
              <span>{label}</span>
              {currentTheme === value && (
                <svg className="inkstream-theme-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Toolbar context ───────────────────────────────────────────────────────────
//
// Provides stable references to the EditorStateStore, EditorView, and
// dispatch helpers to child button components.  Passing these through a
// context (rather than via props deep into renderToolbarItem callbacks)
// lets LeafButton and DropdownTrigger be defined at module level so React
// always sees the same component type — a prerequisite for React.memo to
// prevent re-mounts when the parent Toolbar re-renders (e.g. on theme
// change).

interface ToolbarContextValue {
  store: EditorStateStore | null;
  editorView: EditorView | null;
  executeCommand: (command: ToolbarItem['command']) => void;
  setOpenDropdown: React.Dispatch<React.SetStateAction<string | null>>;
  setOpenNested: React.Dispatch<React.SetStateAction<string | null>>;
  buttonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
}

const ToolbarContext = createContext<ToolbarContextValue>({
  store: null,
  editorView: null,
  executeCommand: () => {},
  setOpenDropdown: () => {},
  setOpenNested: () => {},
  buttonRefs: { current: new Map() },
});

// ── LeafButton ────────────────────────────────────────────────────────────────
//
// Module-level definition ensures React always sees the same component type,
// so React.memo actually prevents remounts when the parent Toolbar re-renders.
// Each instance subscribes independently to the store via useSyncExternalStore
// (via useEditorState) and re-renders ONLY when its own selector value changes.

interface LeafButtonProps {
  item: ToolbarItem;
  depth: number;
}

const LeafButton = memo<LeafButtonProps>(({ item, depth }) => {
  const { store, editorView, executeCommand, setOpenDropdown } = useContext(ToolbarContext);

  const isActive  = useEditorState(store, s => !!item.isActive?.(s));
  const isEnabled = useEditorState(store, s => item.isEnabled ? item.isEnabled(s) : true);
  const isVisible = useEditorState(store, s => item.isVisible ? item.isVisible(s) : true);

  if (isVisible === false) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (item.onClick) {
          item.onClick();
          setOpenDropdown(null);
        } else if (item.command) {
          executeCommand(item.command);
        }
      }}
      className={`inkstream-toolbar-button ${isActive ? 'active' : ''} ${depth > 0 && item.label ? 'inkstream-toolbar-menu-item' : ''}`}
      disabled={!editorView || (!item.command && !item.onClick) || isEnabled === false}
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
});
LeafButton.displayName = 'LeafButton';

// ── DropdownTrigger ───────────────────────────────────────────────────────────

interface DropdownTriggerProps {
  item: ToolbarItem;
  depth: number;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
}

const DropdownTrigger = memo<DropdownTriggerProps>(({ item, depth, isOpen, onToggle }) => {
  const { store, setOpenNested, buttonRefs } = useContext(ToolbarContext);

  const isVisible   = useEditorState(store, s => item.isVisible ? item.isVisible(s) : true);
  const activeColor = useEditorState(store, s => item.getActiveColor ? item.getActiveColor(s) : null);

  if (isVisible === false) return null;

  if (depth > 0) {
    return (
      <button
        className={`inkstream-toolbar-button ${isOpen ? 'active' : ''} ${item.label ? 'inkstream-toolbar-menu-item' : ''}`}
        title={item.tooltip}
        onMouseEnter={() => setOpenNested(item.id)}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpenNested(isOpen ? null : item.id);
        }}
      >
        {item.label ? (
          <span className="inkstream-toolbar-menu-item-inner">
            {item.iconHtml
              ? <span style={item.iconStyle} dangerouslySetInnerHTML={{ __html: item.iconHtml }} />
              : <span style={item.iconStyle}>{item.icon}</span>
            }
            <span className="inkstream-toolbar-menu-label">{item.label}</span>
          </span>
        ) : (
          <span style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
            {item.iconHtml
              ? <span style={item.iconStyle} dangerouslySetInnerHTML={{ __html: item.iconHtml }} />
              : <span style={item.iconStyle}>{item.icon}</span>
            }
            {activeColor && (
              <span className="inkstream-color-indicator" style={{ background: activeColor }} />
            )}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      ref={(ref) => { if (ref) buttonRefs.current.set(item.id, ref); }}
      className={`inkstream-toolbar-button ${isOpen ? 'active' : ''}`}
      title={item.tooltip}
      onClick={onToggle}
    >
      <span style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
        {item.iconHtml
          ? <span style={item.iconStyle} dangerouslySetInnerHTML={{ __html: item.iconHtml }} />
          : <span style={item.iconStyle}>{item.icon}</span>
        }
        {activeColor && (
          <span className="inkstream-color-indicator" style={{ background: activeColor }} />
        )}
      </span>
    </button>
  );
});
DropdownTrigger.displayName = 'DropdownTrigger';

// ── Toolbar ───────────────────────────────────────────────────────────────────

interface ToolbarProps {
  /** Per-transaction notification store — toolbar buttons subscribe via useEditorState. */
  store: EditorStateStore | null;
  /** The current EditorView instance (null before the editor mounts). */
  editorView: EditorView | null;
  toolbarItems: (ToolbarItem | string)[];
  /** When provided, renders a ThemeToggle button at the right end of the toolbar. */
  themeMode?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
}

export const Toolbar = memo<ToolbarProps>(({ store, editorView, toolbarItems, themeMode, onThemeChange }) => {
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
        if (ref && ref.contains(target)) isInside = true;
      });
      buttonRefs.current.forEach(ref => {
        if (ref && ref.contains(target)) isInside = true;
      });

      if (!isInside) {
        setOpenDropdown(null);
        setOpenNested(null);
      }
    };

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

  const executeCommand = useCallback((command: ToolbarItem['command']) => {
    if (editorView && command) {
      editorView.focus();
      command(editorView.state, editorView.dispatch, editorView);
      setOpenDropdown(null);
    }
  }, [editorView]);

  // Stable context value — only changes when editorView/store mount (once).
  // React.memo on LeafButton / DropdownTrigger prevents re-renders from Toolbar
  // parent re-renders; useSyncExternalStore inside each button drives selective
  // per-transaction re-renders.
  const ctxValue = useMemo<ToolbarContextValue>(() => ({
    store,
    editorView,
    executeCommand,
    setOpenDropdown,
    setOpenNested,
    buttonRefs,
  }), [store, editorView, executeCommand]);

  // ── Rendering helpers ───────────────────────────────────────────────────────

  const renderDropdownChildren = (
    children: (ToolbarItem | string)[],
    layout: ToolbarItem['childrenLayout'] | undefined,
    depth: number,
  ) => {
    if (layout !== 'grid') {
      return children.map((child, i) => renderToolbarItem(child, i, depth));
    }

    const isSwatch = (child: ToolbarItem | string) =>
      typeof child === 'object' &&
      !child.id?.includes('sep') &&
      !child.id?.includes('last-used') &&
      child.type !== 'color-picker' &&
      child.type !== 'label';

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
          <div className="inkstream-color-grid">
            {swatches.map((child, i) => renderToolbarItem(child, i, depth))}
          </div>
        )}
        {postGrid.map((child, i) => renderToolbarItem(child, i + swatches.length, depth))}
      </>
    );
  };

  const renderToolbarItem = (item: ToolbarItem | string, index: number, depth = 0): React.ReactNode => {
    if (typeof item === 'string' && item === '|') {
      return <div key={`separator-${index}`} className="inkstream-toolbar-separator" />;
    } else if (typeof item === 'object') {
      if (item.icon === '|') {
        return <div key={item.id ?? `sep-${index}`} className={depth > 0 ? 'inkstream-dropdown-divider' : 'inkstream-toolbar-separator'} />;
      }

      if (item.type === 'label') {
        return (
          <div key={item.id} className="inkstream-dropdown-section-label">
            {item.label ?? item.tooltip}
          </div>
        );
      }

      if (item.type === 'color-picker') {
        return (
          <input
            key={item.id}
            type="color"
            className="inkstream-toolbar-color-picker"
            title={item.tooltip}
            onChange={(e) => {
              if (item.onColorChange && editorView) {
                const command = item.onColorChange(e.target.value);
                command(editorView.state, editorView.dispatch);
              }
            }}
          />
        );
      }

      if (item.type === 'dropdown' && (item.children || item.getChildren)) {
        const isOpen = openDropdown === item.id || openNested === item.id;
        const isNested = depth > 0;

        const resolvedChildren = item.getChildren && editorView
          ? item.getChildren(editorView.state)
          : (item.children ?? []);

        if (isNested) {
          return (
            <div key={item.id} className="inkstream-toolbar-dropdown">
              <DropdownTrigger
                item={item}
                depth={depth}
                isOpen={isOpen}
                onToggle={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setOpenNested(isOpen ? null : item.id);
                }}
              />
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

        return (
          <React.Fragment key={item.id}>
            <DropdownTrigger
              item={item}
              depth={depth}
              isOpen={isOpen}
              onToggle={(e) => {
                e.stopPropagation();
                if (item.onClick) {
                  item.onClick();
                  setOpenDropdown(null);
                } else if (isOpen) {
                  setOpenDropdown(null);
                } else {
                  setOpenDropdown(item.id);
                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  setDropdownPosition({ top: rect.bottom + 5, left: rect.left });
                }
              }}
            />
            {isOpen && (
              <div
                ref={(ref) => { if (ref) dropdownRefs.current.set(item.id, ref); }}
                className="inkstream-toolbar-bubble-menu"
                style={{
                  position: 'fixed',
                  top: dropdownPosition?.top || 0,
                  left: dropdownPosition?.left || 0,
                  zIndex: 9999,
                }}
                onMouseLeave={() => setOpenNested(null)}
              >
                {renderDropdownChildren(resolvedChildren, item.childrenLayout, depth + 1)}
              </div>
            )}
          </React.Fragment>
        );
      }

      return <LeafButton key={item.id} item={item} depth={depth} />;
    } else {
      return <div key={`separator-${index}`} className="inkstream-toolbar-separator" />;
    }
  };

  return (
    <ToolbarContext.Provider value={ctxValue}>
      <div className="inkstream-toolbar">
        {toolbarItems.map((item, index) => renderToolbarItem(item, index))}
        {themeMode !== undefined && onThemeChange && (
          <ThemeToggle currentTheme={themeMode} onChange={onThemeChange} />
        )}
      </div>
    </ToolbarContext.Provider>
  );
});
Toolbar.displayName = 'Toolbar';
