import { EditorState, Transaction } from 'prosemirror-state';
type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
export declare const toggleCode: Command;
export declare const setCode: Command;
export declare const unsetCode: Command;
export declare const isCodeActive: (state: EditorState) => boolean;
export declare const codePlugin: import("./index").Plugin;
export {};
