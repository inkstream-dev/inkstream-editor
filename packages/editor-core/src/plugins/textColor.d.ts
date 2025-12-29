import { EditorState, Transaction } from 'prosemirror-state';
export declare function setTextColor(color: string): (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
export declare const textColorPlugin: import("./index").Plugin;
