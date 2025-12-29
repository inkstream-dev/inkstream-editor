import { EditorState, Transaction } from 'prosemirror-state';
type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
export declare const toggleBulletList: Command;
export declare const isBulletListActive: (state: EditorState) => boolean;
export declare const bulletListPlugin: import("./index").Plugin;
export {};
