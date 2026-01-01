"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLinkBubbleToolbarItem = exports.linkBubblePlugin = void 0;
const prosemirror_state_1 = require("prosemirror-state");
exports.linkBubblePlugin = new prosemirror_state_1.Plugin({
    view(editorView) {
        console.log("linkBubblePlugin view method called.");
        return new LinkBubbleView(editorView);
    },
});
const getLinkBubbleToolbarItem = (schema) => {
    return {
        id: 'link',
        icon: '🔗',
        tooltip: 'Link',
        command: (state, dispatch, view) => {
            if (view) {
                const editorWrapper = view.dom.parentNode?.parentNode;
                const bubble = editorWrapper?.querySelector('.link-dropdown');
                if (bubble) {
                    const toolbar = editorWrapper?.querySelector('.inkstream-toolbar');
                    if (toolbar) {
                        const linkButton = toolbar.querySelector('button[title="Link"]'); // Find the specific link button
                        if (linkButton) {
                            const linkButtonRect = linkButton.getBoundingClientRect();
                            const editorWrapperRect = editorWrapper.getBoundingClientRect();
                            bubble.style.top = `${linkButtonRect.bottom - editorWrapperRect.top + 5}px`; // 5px below the link button
                            bubble.style.left = `${linkButtonRect.left - editorWrapperRect.left}px`;
                        }
                    }
                    bubble.style.display = 'block';
                    const input = bubble.querySelector('input');
                    if (input) {
                        const { selection } = state;
                        const marks = state.doc.resolve(selection.from).marks();
                        const linkMark = marks.find((mark) => mark.type.name === 'link');
                        input.value = linkMark?.attrs.href || '';
                        input.focus();
                    }
                }
            }
            return true;
        },
        isActive: (state) => {
            const { from, to } = state.selection;
            return state.doc.rangeHasMark(from, to, schema.marks.link);
        },
    };
};
exports.getLinkBubbleToolbarItem = getLinkBubbleToolbarItem;
class LinkBubbleView {
    constructor(editorView) {
        this.view = editorView;
        this.bubble = document.createElement('div');
        this.bubble.className = 'link-dropdown';
        this.bubble.innerHTML = `
      <input type="text" placeholder="Enter link..." />
      <button class="visit">Visit</button>
      <button class="delete">Delete</button>
    `;
        this.bubble.style.position = 'absolute';
        this.bubble.style.display = 'none';
        this.view.dom.parentNode?.parentNode?.appendChild(this.bubble);
        this.bubble.querySelector('input')?.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.bubble.querySelector('.visit')?.addEventListener('click', this.handleVisit.bind(this));
        this.bubble.querySelector('.delete')?.addEventListener('click', this.handleDelete.bind(this));
        this.view.dom.parentNode?.parentNode?.addEventListener('click', this.handleDocumentClick.bind(this));
        this.update(editorView, undefined);
    }
    update(view, prevState) {
        const { state } = view;
        const { selection } = state;
        const { from, to } = selection;
        const { schema } = state;
        const hasLinkInSelection = state.doc.rangeHasMark(from, to, schema.marks.link);
        if (!selection.empty && hasLinkInSelection) {
            let linkMark;
            state.doc.nodesBetween(from, to, (node, pos) => {
                if (linkMark)
                    return false;
                const marks = node.marks;
                const found = marks.find((mark) => mark.type.name === 'link');
                if (found) {
                    linkMark = found;
                    return false;
                }
            });
            if (linkMark) {
                this.bubble.style.display = 'block';
                const input = this.bubble.querySelector('input');
                if (input) {
                    input.value = linkMark.attrs.href || '';
                }
            }
            else if (this.bubble.style.display === 'block') {
                // If bubble is already visible, but no link is found in selection, hide it.
                this.bubble.style.display = 'none';
                console.log("Update method: Hiding bubble (no link found in selection, but was visible).");
            }
        }
        else if (this.bubble.style.display === 'block') {
            // If selection is empty or no link in selection, and bubble is visible, hide it.
            this.bubble.style.display = 'none';
            console.log("Update method: Hiding bubble (no selection or no link in selection, but was visible).");
        }
    }
    destroy() {
        this.bubble.remove();
        document.removeEventListener('click', this.handleDocumentClick.bind(this));
    }
    handleKeyDown(event) {
        if (event.key === 'Enter') {
            const { state, dispatch } = this.view;
            const { selection } = state;
            const link = event.target.value;
            const { from, to } = selection;
            if (link) {
                const mark = state.schema.marks.link.create({ href: link });
                dispatch(state.tr.addMark(from, to, mark));
            }
            this.bubble.style.display = 'none';
        }
    }
    handleVisit() {
        const link = this.bubble.querySelector('input')?.value;
        if (link) {
            window.open(link, '_blank');
        }
    }
    handleDelete() {
        const { state, dispatch } = this.view;
        const { selection } = state;
        const { from, to } = selection;
        dispatch(state.tr.removeMark(from, to, state.schema.marks.link));
        this.bubble.style.display = 'none';
    }
    handleDocumentClick(event) {
        if (this.bubble.style.display === 'block' && !this.bubble.contains(event.target) && !this.view.dom.contains(event.target)) {
            this.bubble.style.display = 'none';
        }
    }
}
