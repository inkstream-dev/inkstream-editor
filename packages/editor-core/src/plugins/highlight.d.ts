import { EditorState, Transaction } from 'prosemirror-state';
export declare function setHighlight(color: string): (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
export declare const unsetHighlight: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
export declare const highlightPlugin: import("./index").Plugin;
