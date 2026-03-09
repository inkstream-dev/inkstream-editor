"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { tableDialogBridge } from '@inkstream-dev/editor-core';

// ─── Types ────────────────────────────────────────────────────────────────────

type HAlign = 'left' | 'center' | 'right';
type VAlign = 'top' | 'middle' | 'bottom';
type Tab = 'cell' | 'table';

interface CellState {
  background: string | null;
  alignment: HAlign;
  verticalAlignment: VAlign;
  border: string | null;
}

interface TablePropertiesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Preset colors ────────────────────────────────────────────────────────────

const BG_COLORS: Array<{ label: string; value: string | null; swatch: string }> = [
  { label: 'None', value: null, swatch: 'transparent' },
  { label: 'Yellow', value: '#fff3cd', swatch: '#fff3cd' },
  { label: 'Green', value: '#d1e7dd', swatch: '#d1e7dd' },
  { label: 'Blue', value: '#cfe2ff', swatch: '#cfe2ff' },
  { label: 'Red', value: '#f8d7da', swatch: '#f8d7da' },
  { label: 'Purple', value: '#e2d9f3', swatch: '#e2d9f3' },
  { label: 'Orange', value: '#ffe5d0', swatch: '#ffe5d0' },
  { label: 'Gray', value: '#e9ecef', swatch: '#e9ecef' },
  { label: 'Teal', value: '#d2f4ea', swatch: '#d2f4ea' },
  { label: 'Pink', value: '#fce4ec', swatch: '#fce4ec' },
  { label: 'Indigo', value: '#e8eaf6', swatch: '#e8eaf6' },
  { label: 'Lime', value: '#f0f4c3', swatch: '#f0f4c3' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11000,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    width: '420px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px 0',
  },
  title: { margin: 0, fontSize: '17px', fontWeight: 600, color: '#1a1a1a' },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  tabs: {
    display: 'flex',
    gap: '2px',
    padding: '12px 20px 0',
    borderBottom: '1px solid #e5e5e5',
  },
  tab: (active: boolean) => ({
    padding: '8px 16px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    color: active ? '#2563eb' : '#555',
    borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
    fontSize: '14px',
    marginBottom: '-1px',
  } as React.CSSProperties),
  body: { padding: '20px', overflowY: 'auto' as const, flex: 1 },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#444',
  },
  fieldGroup: { marginBottom: '18px' },
  btnGroup: { display: 'flex', gap: '6px' },
  btnToggle: (active: boolean) => ({
    padding: '6px 14px',
    border: `1px solid ${active ? '#2563eb' : '#ddd'}`,
    borderRadius: '5px',
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#2563eb' : '#444',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
  } as React.CSSProperties),
  swatchGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px' },
  swatch: (color: string, selected: boolean) => ({
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    backgroundColor: color === 'transparent' ? '#fff' : color,
    border: selected ? '2px solid #2563eb' : '1.5px solid #ccc',
    cursor: 'pointer',
    backgroundImage: color === 'transparent'
      ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px'
      : 'none',
  } as React.CSSProperties),
  input: {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '13px',
    boxSizing: 'border-box' as const,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '12px 20px',
    borderTop: '1px solid #e5e5e5',
  },
  cancelBtn: {
    padding: '8px 18px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    background: '#fff',
    color: '#555',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  applyBtn: {
    padding: '8px 18px',
    border: 'none',
    borderRadius: '5px',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  },
  dangerBtn: {
    padding: '8px 18px',
    border: '1px solid #ef4444',
    borderRadius: '5px',
    background: '#fff',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  divider: { borderColor: '#f0f0f0', margin: '6px 0 16px' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const TablePropertiesDialog: React.FC<TablePropertiesDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('cell');

  // Cell settings state
  const [bg, setBg] = useState<string | null>(null);
  const [customBg, setCustomBg] = useState('');
  const [hAlign, setHAlign] = useState<HAlign>('left');
  const [vAlign, setVAlign] = useState<VAlign>('top');
  const [border, setBorder] = useState('');

  // Populate from current editor state when opening
  useEffect(() => {
    if (!isOpen) return;
    const view = tableDialogBridge.getEditorView?.();
    if (!view) return;
    // Dynamically import getCellAttrs from pro-plugins at runtime to avoid
    // a hard dependency in the react-editor package.
    const state = view.state;
    const { $from } = state.selection;
    for (let d = $from.depth; d > 0; d--) {
      const role = $from.node(d).type.spec.tableRole as string | undefined;
      if (role === 'cell' || role === 'header_cell') {
        const attrs = $from.node(d).attrs;
        setBg(attrs.background ?? null);
        setCustomBg(attrs.background ?? '');
        setHAlign((attrs.alignment as HAlign) ?? 'left');
        setVAlign((attrs.verticalAlignment as VAlign) ?? 'top');
        setBorder(attrs.border ?? '');
        break;
      }
    }
    setActiveTab('cell');
  }, [isOpen]);

  // Keyboard: close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleApply = useCallback(() => {
    const effectiveBg = customBg.trim() || bg;
    tableDialogBridge.applyCellStyling?.({
      background: effectiveBg || null,
      alignment: hAlign,
      verticalAlignment: vAlign,
      border: border.trim() || null,
    });
    onClose();
  }, [bg, customBg, hAlign, vAlign, border, onClose]);

  const handleDeleteTable = useCallback(() => {
    tableDialogBridge.runDeleteTable?.();
    onClose();
  }, [onClose]);

  const handleToggleHeaderRow = useCallback(() => {
    tableDialogBridge.runToggleHeaderRow?.();
  }, []);

  if (!isOpen) return null;

  return (
    <div
      style={S.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={S.dialog} role="dialog" aria-modal="true" aria-label="Table Properties">
        {/* Header */}
        <div style={S.header}>
          <h2 style={S.title}>Table Properties</h2>
          <button style={S.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div style={S.tabs} role="tablist">
          {(['cell', 'table'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={activeTab === t}
              style={S.tab(activeTab === t)}
              onClick={() => setActiveTab(t)}
            >
              {t === 'cell' ? 'Cell' : 'Table'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={S.body}>
          {activeTab === 'cell' && (
            <>
              {/* Background color */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Background Color</label>
                <div style={S.swatchGrid}>
                  {BG_COLORS.map((c) => (
                    <button
                      key={c.label}
                      title={c.label}
                      style={S.swatch(c.swatch, bg === c.value && !customBg.trim())}
                      onClick={() => { setBg(c.value); setCustomBg(c.value ?? ''); }}
                      aria-label={c.label}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Custom hex or rgb, e.g. #ff9900"
                  value={customBg}
                  onChange={(e) => { setCustomBg(e.target.value); setBg(null); }}
                  style={{ ...S.input, marginTop: '8px' }}
                />
              </div>

              {/* Horizontal alignment */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Horizontal Alignment</label>
                <div style={S.btnGroup}>
                  {(['left', 'center', 'right'] as HAlign[]).map((a) => (
                    <button
                      key={a}
                      style={S.btnToggle(hAlign === a)}
                      onClick={() => setHAlign(a)}
                    >
                      {a === 'left' ? '⬅ Left' : a === 'center' ? '↔ Center' : '➡ Right'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vertical alignment */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Vertical Alignment</label>
                <div style={S.btnGroup}>
                  {(['top', 'middle', 'bottom'] as VAlign[]).map((a) => (
                    <button
                      key={a}
                      style={S.btnToggle(vAlign === a)}
                      onClick={() => setVAlign(a)}
                    >
                      {a === 'top' ? '⬆ Top' : a === 'middle' ? '↕ Middle' : '⬇ Bottom'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Border */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Cell Border</label>
                <input
                  type="text"
                  placeholder="CSS border, e.g. 2px solid #000 (blank to remove)"
                  value={border}
                  onChange={(e) => setBorder(e.target.value)}
                  style={S.input}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'None', value: '' },
                    { label: 'Thin', value: '1px solid #666' },
                    { label: 'Medium', value: '2px solid #333' },
                    { label: 'Dashed', value: '1px dashed #666' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      style={S.btnToggle(border === p.value)}
                      onClick={() => setBorder(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'table' && (
            <>
              <div style={S.fieldGroup}>
                <label style={S.label}>Header Row</label>
                <button style={S.btnToggle(false)} onClick={handleToggleHeaderRow}>
                  ⌃ Toggle Header Row
                </button>
                <p style={{ fontSize: '12px', color: '#888', margin: '6px 0 0' }}>
                  Converts the first row between a header row and a regular row.
                </p>
              </div>

              <hr style={S.divider} />

              <div style={S.fieldGroup}>
                <label style={S.label}>Danger Zone</label>
                <button style={S.dangerBtn} onClick={handleDeleteTable}>
                  ✕ Delete Table
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
          {activeTab === 'cell' && (
            <button style={S.applyBtn} onClick={handleApply}>Apply</button>
          )}
        </div>
      </div>
    </div>
  );
};
