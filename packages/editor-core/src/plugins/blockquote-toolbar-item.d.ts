import { EditorState, Transaction } from 'prosemirror-state';
export declare const blockquoteToolbarItem: {
    id: string;
    icon: string;
    tooltip: string;
    command: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
    isActive: (state: EditorState) => boolean;
};
