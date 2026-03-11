import { EditorState, Plugin, PluginKey, TextSelection, Transaction } from '@inkstream/pm/state';
import { EditorView } from '@inkstream/pm/view';
import { Schema, Mark } from '@inkstream/pm/model';
import { ToolbarItem } from '@inkstream/editor-core';

// Module-level reference to the active bubble view (one editor instance at a time)
let activeLinkBubble: LinkBubbleView | null = null;

export function openLinkBubble(view: EditorView): void {
  activeLinkBubble?.open(view);
}

export function removeLinkAtSelection(
  state: EditorState,
  dispatch?: (tr: Transaction) => void
): boolean {
  const linkType = state.schema.marks.link;
  if (!linkType) return false;
  const { from, to } = state.selection;
  if (from === to) {
    // cursor — expand to full link range
    const range = getLinkRangeAt(state, from);
    if (!range) return false;
    if (dispatch) dispatch(state.tr.removeMark(range.from, range.to, linkType));
    return true;
  }
  if (dispatch) dispatch(state.tr.removeMark(from, to, linkType));
  return true;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const STYLES_ID = 'inkstream-link-bubble-styles';

function injectStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = `
    .inkstream-link-bubble {
      position: fixed;
      z-index: 10000;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08);
      padding: 12px 14px;
      min-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
    }
    .inkstream-link-bubble-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .inkstream-link-bubble-title {
      font-weight: 600;
      color: #1a202c;
    }
    .inkstream-link-bubble-close {
      background: none;
      border: none;
      cursor: pointer;
      color: #718096;
      font-size: 14px;
      padding: 2px 4px;
      line-height: 1;
      border-radius: 3px;
    }
    .inkstream-link-bubble-close:hover { color: #1a202c; background: #f7fafc; }
    .inkstream-link-bubble-url-row {
      display: flex;
      gap: 6px;
      margin-bottom: 4px;
    }
    .inkstream-link-bubble-input {
      flex: 1;
      padding: 6px 10px;
      border: 1px solid #cbd5e0;
      border-radius: 5px;
      font-size: 13px;
      outline: none;
      color: #2d3748;
      transition: border-color 0.15s, box-shadow 0.15s;
      min-width: 0;
    }
    .inkstream-link-bubble-input:focus {
      border-color: #4299e1;
      box-shadow: 0 0 0 2px rgba(66,153,225,0.2);
    }
    .inkstream-link-bubble-input.is-invalid { border-color: #fc8181; }
    .inkstream-link-bubble-input.is-invalid:focus {
      border-color: #fc8181;
      box-shadow: 0 0 0 2px rgba(252,129,129,0.2);
    }
    .inkstream-link-bubble-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .inkstream-link-bubble-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .inkstream-link-bubble-btn-apply {
      background: #3182ce;
      color: #fff;
    }
    .inkstream-link-bubble-btn-apply:hover:not(:disabled) { background: #2b6cb0; }
    .inkstream-link-bubble-error {
      color: #c53030;
      font-size: 11px;
      min-height: 16px;
      margin-bottom: 4px;
    }
    .inkstream-link-bubble-options {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 10px;
    }
    .inkstream-link-bubble-checkbox { cursor: pointer; accent-color: #3182ce; }
    .inkstream-link-bubble-label {
      color: #4a5568;
      cursor: pointer;
      user-select: none;
      font-size: 12px;
    }
    .inkstream-link-bubble-preview {
      font-size: 11px;
      color: #718096;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 8px;
      padding: 4px 8px;
      background: #f7fafc;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    .inkstream-link-bubble-preview a {
      color: #3182ce;
      text-decoration: none;
    }
    .inkstream-link-bubble-preview a:hover { text-decoration: underline; }
    .inkstream-link-bubble-actions {
      display: flex;
      gap: 6px;
      padding-top: 8px;
      border-top: 1px solid #f0f0f0;
    }
    .inkstream-link-bubble-btn-remove {
      background: #fff5f5;
      color: #c53030;
      border: 1px solid #feb2b2;
    }
    .inkstream-link-bubble-btn-remove:hover:not(:disabled) { background: #fed7d7; }
    .inkstream-link-bubble-btn-copy {
      background: #f7fafc;
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }
    .inkstream-link-bubble-btn-copy:hover:not(:disabled) { background: #edf2f7; }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function normalizeUrl(url: string): string {
  url = url.trim();
  if (!url) return '';
  if (!/^[a-z][a-z0-9+\-.]*:\/\//i.test(url)) return 'https://' + url;
  return url;
}

export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try { new URL(url); return true; } catch { return false; }
}

interface LinkRange { from: number; to: number; mark: Mark; }

function getLinkRangeAt(state: EditorState, pos: number): LinkRange | null {
  const linkType = state.schema.marks.link;
  if (!linkType) return null;
  const $pos = state.doc.resolve(pos);
  if (!linkType.isInSet($pos.marks())) return null;

  const blockStart = $pos.start($pos.depth);
  const blockEnd = $pos.end($pos.depth);
  let result: LinkRange | null = null;

  state.doc.nodesBetween(blockStart, blockEnd, (node, nodePos) => {
    if (!node.isText) return;
    const m = linkType.isInSet(node.marks);
    if (!m) return;
    const nodeEnd = nodePos + node.nodeSize;
    if (nodePos <= pos && nodeEnd >= pos) {
      if (!result) result = { from: nodePos, to: nodeEnd, mark: m };
      else { result.from = Math.min(result.from, nodePos); result.to = Math.max(result.to, nodeEnd); }
    }
  });
  return result;
}

// ---------------------------------------------------------------------------
// LinkBubbleView — ProseMirror PluginView
// ---------------------------------------------------------------------------
const BUBBLE_CHECKBOX_ID = 'inkstream-link-newtab';

class LinkBubbleView {
  private view: EditorView;
  private bubble!: HTMLDivElement;
  private urlInput!: HTMLInputElement;
  private newTabCheckbox!: HTMLInputElement;
  private applyBtn!: HTMLButtonElement;
  private removeBtn!: HTMLButtonElement;
  private copyBtn!: HTMLButtonElement;
  private errorEl!: HTMLElement;
  private previewEl!: HTMLElement;

  isOpen = false;
  private savedFrom = 0;
  private savedTo = 0;
  private ignoreNextUpdate = false;
  private outsideClickHandler: (e: MouseEvent) => void;

  constructor(view: EditorView) {
    this.view = view;
    activeLinkBubble = this;
    injectStyles();
    this.buildBubble();
    this.outsideClickHandler = this.onOutsideClick.bind(this);
    document.addEventListener('mousedown', this.outsideClickHandler, true);
  }

  private buildBubble(): void {
    const id = BUBBLE_CHECKBOX_ID + '-' + Math.random().toString(36).slice(2);
    const el = document.createElement('div');
    el.className = 'inkstream-link-bubble';
    el.setAttribute('hidden', '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Link editor');
    el.innerHTML = `
      <div class="inkstream-link-bubble-header">
        <span class="inkstream-link-bubble-title">Link</span>
        <button type="button" class="inkstream-link-bubble-close" aria-label="Close">✕</button>
      </div>
      <div class="inkstream-link-bubble-url-row">
        <input
          type="url"
          class="inkstream-link-bubble-input"
          placeholder="https://example.com"
          aria-label="URL"
          autocomplete="off"
          spellcheck="false"
        />
        <button type="button" class="inkstream-link-bubble-btn inkstream-link-bubble-btn-apply">Apply</button>
      </div>
      <div class="inkstream-link-bubble-error" role="alert"></div>
      <div class="inkstream-link-bubble-options">
        <input type="checkbox" class="inkstream-link-bubble-checkbox" id="${id}" />
        <label class="inkstream-link-bubble-label" for="${id}">Open in new tab</label>
      </div>
      <div class="inkstream-link-bubble-preview" style="display:none"></div>
      <div class="inkstream-link-bubble-actions">
        <button type="button" class="inkstream-link-bubble-btn inkstream-link-bubble-btn-remove">Remove link</button>
        <button type="button" class="inkstream-link-bubble-btn inkstream-link-bubble-btn-copy">Copy link</button>
      </div>
    `;

    this.urlInput      = el.querySelector('.inkstream-link-bubble-input') as HTMLInputElement;
    this.newTabCheckbox = el.querySelector('.inkstream-link-bubble-checkbox') as HTMLInputElement;
    this.applyBtn      = el.querySelector('.inkstream-link-bubble-btn-apply') as HTMLButtonElement;
    this.removeBtn     = el.querySelector('.inkstream-link-bubble-btn-remove') as HTMLButtonElement;
    this.copyBtn       = el.querySelector('.inkstream-link-bubble-btn-copy') as HTMLButtonElement;
    this.errorEl       = el.querySelector('.inkstream-link-bubble-error') as HTMLElement;
    this.previewEl     = el.querySelector('.inkstream-link-bubble-preview') as HTMLElement;

    this.urlInput.addEventListener('keydown', this.onInputKeyDown.bind(this));
    this.urlInput.addEventListener('input', this.onUrlChange.bind(this));
    this.applyBtn.addEventListener('click', this.apply.bind(this));
    this.removeBtn.addEventListener('click', this.remove.bind(this));
    this.copyBtn.addEventListener('click', this.copy.bind(this));
    el.querySelector('.inkstream-link-bubble-close')!
      .addEventListener('click', () => { this.close(); this.view.focus(); });

    document.body.appendChild(el);
    this.bubble = el;
  }

  open(view: EditorView): void {
    this.view = view;
    const { state } = view;
    const { from, to } = state.selection;

    // Find existing link at cursor or within selection
    let linkRange = getLinkRangeAt(state, from);
    if (!linkRange && from !== to) {
      // scan selection for any link
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (linkRange || !node.isText) return;
        const m = state.schema.marks.link && state.schema.marks.link.isInSet(node.marks);
        if (m) linkRange = { from: pos, to: pos + node.nodeSize, mark: m };
      });
    }

    if (linkRange) {
      this.savedFrom = linkRange.from;
      this.savedTo   = linkRange.to;
      this.urlInput.value = linkRange.mark.attrs.href || '';
      this.newTabCheckbox.checked = linkRange.mark.attrs.target === '_blank';
      this.removeBtn.style.display = '';
    } else {
      this.savedFrom = from;
      this.savedTo   = to;
      this.urlInput.value = '';
      this.newTabCheckbox.checked = false;
      this.removeBtn.style.display = from === to ? 'none' : '';
    }

    this.clearError();
    this.updatePreview(this.urlInput.value);
    this.isOpen = true;
    this.bubble.removeAttribute('hidden');
    this.position(view, from);
    requestAnimationFrame(() => { this.urlInput.focus(); this.urlInput.select(); });
  }

  private position(view: EditorView, pos: number): void {
    const safePos = Math.min(Math.max(0, pos), view.state.doc.content.size);
    const coords = view.coordsAtPos(safePos);
    const bubbleW = 320;
    let left = coords.left;
    let top  = coords.bottom + 8;

    if (left + bubbleW > window.innerWidth - 8) left = window.innerWidth - bubbleW - 8;
    left = Math.max(8, left);

    this.bubble.style.left = `${left}px`;
    this.bubble.style.top  = `${top}px`;

    // Flip above if it overflows viewport bottom
    requestAnimationFrame(() => {
      const rect = this.bubble.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 8) {
        this.bubble.style.top = `${coords.top - rect.height - 8}px`;
      }
    });
  }

  private onInputKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter')  { e.preventDefault(); this.apply(); return; }
    if (e.key === 'Escape') { e.preventDefault(); this.close(); this.view.focus(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const focusable = Array.from(
        this.bubble.querySelectorAll<HTMLElement>('input, button:not([disabled])')
      );
      const idx = focusable.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey
        ? focusable[(idx - 1 + focusable.length) % focusable.length]
        : focusable[(idx + 1) % focusable.length];
      next?.focus();
    }
  }

  private onUrlChange(): void {
    this.clearError();
    this.updatePreview(this.urlInput.value);
  }

  private updatePreview(raw: string): void {
    if (!raw.trim()) { this.previewEl.style.display = 'none'; return; }
    const url = normalizeUrl(raw);
    if (isValidUrl(url)) {
      this.previewEl.style.display = 'block';
      // Sanitize display: use textContent, not innerHTML for the href
      this.previewEl.textContent = '';
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = url;
      this.previewEl.appendChild(a);
    } else {
      this.previewEl.style.display = 'none';
    }
  }

  private clearError(): void {
    this.errorEl.textContent = '';
    this.urlInput.classList.remove('is-invalid');
  }

  private apply(): void {
    const raw = this.urlInput.value.trim();
    if (!raw) { this.remove(); return; }

    const url = normalizeUrl(raw);
    if (!isValidUrl(url)) {
      this.urlInput.classList.add('is-invalid');
      this.errorEl.textContent = 'Please enter a valid URL';
      this.urlInput.focus();
      return;
    }

    const { state, dispatch } = this.view;
    const linkType = state.schema.marks.link;
    if (!linkType) return;

    const attrs: Record<string, string | null> = {
      href: url,
      title: null,
      target: this.newTabCheckbox.checked ? '_blank' : null,
      rel:    this.newTabCheckbox.checked ? 'noopener noreferrer' : null,
    };

    this.ignoreNextUpdate = true;
    let tr = state.tr
      .removeMark(this.savedFrom, this.savedTo, linkType)
      .addMark(this.savedFrom, this.savedTo, linkType.create(attrs));

    // Restore selection to end of link range
    const $to = tr.doc.resolve(Math.min(this.savedTo, tr.doc.content.size));
    tr = tr.setSelection(TextSelection.near($to));
    dispatch(tr);

    this.close();
    this.view.focus();
  }

  private remove(): void {
    const { state, dispatch } = this.view;
    const linkType = state.schema.marks.link;
    if (!linkType) return;
    this.ignoreNextUpdate = true;
    dispatch(state.tr.removeMark(this.savedFrom, this.savedTo, linkType));
    this.close();
    this.view.focus();
  }

  private copy(): void {
    const url = normalizeUrl(this.urlInput.value);
    if (!url) return;
    navigator.clipboard?.writeText(url).catch(() => {});
    const orig = this.copyBtn.textContent;
    this.copyBtn.textContent = 'Copied!';
    setTimeout(() => { if (this.copyBtn) this.copyBtn.textContent = orig; }, 1500);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.bubble.setAttribute('hidden', '');
  }

  private onOutsideClick(e: MouseEvent): void {
    if (!this.isOpen) return;
    if (this.bubble.contains(e.target as Node)) return;
    if (this.view.dom.contains(e.target as Node)) return;
    this.close();
  }

  // ProseMirror PluginView lifecycle
  update(view: EditorView, _prevState: EditorState): void {
    this.view = view;
    if (this.ignoreNextUpdate) { this.ignoreNextUpdate = false; return; }
    // Bubble stays open until explicitly closed; no auto-behaviour on selection change
  }

  destroy(): void {
    document.removeEventListener('mousedown', this.outsideClickHandler, true);
    if (activeLinkBubble === this) activeLinkBubble = null;
    this.bubble.remove();
  }
}

// ---------------------------------------------------------------------------
// ProseMirror plugin factory
// ---------------------------------------------------------------------------
export const LINK_BUBBLE_KEY = new PluginKey('linkBubble');

export const linkBubblePlugin = new Plugin({
  key: LINK_BUBBLE_KEY,
  view(editorView) {
    return new LinkBubbleView(editorView);
  },
});

// ---------------------------------------------------------------------------
// Toolbar item
// ---------------------------------------------------------------------------
export const getLinkBubbleToolbarItem = (schema: Schema): ToolbarItem => ({
  id: 'link',
  icon: '🔗',
  tooltip: 'Link (Cmd+K)',
  command: (_state, _dispatch, view) => {
    if (view) openLinkBubble(view);
    return true;
  },
  isActive: (state: EditorState) => {
    if (!schema.marks.link) return false;
    const { from, to } = state.selection;
    if (from === to) {
      return !!schema.marks.link.isInSet(state.doc.resolve(from).marks());
    }
    return state.doc.rangeHasMark(from, to, schema.marks.link);
  },
});
