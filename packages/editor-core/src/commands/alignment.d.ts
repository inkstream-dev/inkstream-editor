import { EditorState, Transaction } from 'prosemirror-state';
export declare const setAlignment: (align: "left" | "center" | "right" | null) => (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
