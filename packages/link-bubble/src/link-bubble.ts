import { EditorState, Plugin, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, Mark, Node } from 'prosemirror-model';
import { ToolbarItem } from '@inkstream/editor-core';

export const linkBubblePlugin = new Plugin({
  view(editorView) {
    return new LinkBubbleView(editorView);
  },
});

export const getLinkBubbleToolbarItem = (schema: Schema): ToolbarItem => {
  return {
    id: 'link',
    icon: '🔗',
    tooltip: 'Link',
    command: (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => {
      console.log("Link toolbar command executed.");
      if (view) {
        const { selection } = state;
        // Always show the bubble when the command is explicitly called (e.g., from toolbar click)
        // The LinkBubbleView's update method will handle hiding it if the selection changes to an unlinked state.
        console.log("Attempting to find parentNode:", view.dom.parentNode);
        const bubble = view.dom.parentNode?.querySelector('.link-bubble') as HTMLDivElement;
        console.log("Bubble element found:", bubble);
        if (bubble) {
          console.log("Setting bubble display to block.");
          bubble.style.display = 'block';
          const start = view.coordsAtPos(selection.from);
          const end = view.coordsAtPos(selection.to);
          const left = Math.max((start.left + end.left) / 2, start.left);
          bubble.style.left = `${left}px`;
          bubble.style.bottom = `${start.bottom + 10}px`;

          const input = bubble.querySelector('input');
          if (input) {
            const marks = state.doc.resolve(selection.from).marks();
            const linkMark = marks.find((mark: Mark) => mark.type.name === 'link');
            input.value = linkMark?.attrs.href || '';
            input.focus();
          }

        } else {
          console.log("Bubble element not found.");
        }
      }
      return true;
    },
    isActive: (state: EditorState) => {
      const { from, to } = state.selection;
      return state.doc.rangeHasMark(from, to, schema.marks.link);
    },
  };
};

class LinkBubbleView {
  private view: EditorView;
  private bubble: HTMLDivElement;

  constructor(editorView: EditorView) {
    this.view = editorView;
    this.bubble = document.createElement('div');
    this.bubble.className = 'link-bubble';
    this.bubble.innerHTML = `
      <input type="text" placeholder="Enter link..." />
      <button class="visit">Visit</button>
      <button class="delete">Delete</button>
    `;
    this.bubble.style.position = 'absolute';
    this.bubble.style.display = 'none';
    this.view.dom.parentNode?.appendChild(this.bubble);

    this.bubble.querySelector('input')?.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.bubble.querySelector('.visit')?.addEventListener('click', this.handleVisit.bind(this));
    this.bubble.querySelector('.delete')?.addEventListener('click', this.handleDelete.bind(this));

    this.update(editorView, undefined);
  }

  update(view: EditorView, prevState?: EditorState) {
    const { state } = view;
    const { selection } = state;
    const { from, to } = selection;

    const marks = state.doc.resolve(selection.from).marks();
    const linkMark = marks.find((mark: Mark) => mark.type.name === 'link');

    if (linkMark && !selection.empty) {
      // If a link is selected, ensure the bubble is visible and positioned correctly
      this.bubble.style.display = 'block';
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      const left = Math.max((start.left + end.left) / 2, start.left);
      this.bubble.style.left = `${left}px`;
      this.bubble.style.bottom = `${start.bottom + 10}px`;

      const input = this.bubble.querySelector('input');
      if (input) {
        input.value = linkMark.attrs.href || '';
      }
    } else if (this.bubble.style.display !== 'none') {
      // If no link is selected or selection is empty, and the bubble is currently visible, hide it.
      this.bubble.style.display = 'none';
    }
  }

  destroy() {
    this.bubble.remove();
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const { state, dispatch } = this.view;
      const { selection } = state;
      const link = (event.target as HTMLInputElement).value;
      const { from, to } = selection;

      if (link) {
        const mark = state.schema.marks.link.create({ href: link });
        dispatch(state.tr.addMark(from, to, mark));
      }

      this.bubble.style.display = 'none';
    }
  }

  private handleVisit() {
    const link = this.bubble.querySelector('input')?.value;
    if (link) {
      window.open(link, '_blank');
    }
  }

  private handleDelete() {
    const { state, dispatch } = this.view;
    const { selection } = state;
    const { from, to } = selection;

    dispatch(state.tr.removeMark(from, to, state.schema.marks.link));
    this.bubble.style.display = 'none';
  }
}
