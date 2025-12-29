import { EditorState, Transaction } from 'prosemirror-state';
export declare const applyFontFamily: (fontFamily: string) => (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
