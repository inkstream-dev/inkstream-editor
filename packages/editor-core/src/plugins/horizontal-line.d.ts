import { EditorState, Transaction } from 'prosemirror-state';
export declare const insertHorizontalLine: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
export declare const horizontalLinePlugin: import("./index").Plugin;
