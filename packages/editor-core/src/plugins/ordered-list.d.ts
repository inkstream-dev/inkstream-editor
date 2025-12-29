import { EditorState, Transaction } from 'prosemirror-state';
type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
export declare const toggleOrderedList: Command;
export declare const isOrderedListActive: (state: EditorState) => boolean;
export declare const orderedListPlugin: import("./index").Plugin;
export {};
