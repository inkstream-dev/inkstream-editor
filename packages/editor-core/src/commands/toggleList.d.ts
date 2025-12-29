import { EditorState, Transaction } from 'prosemirror-state';
import { NodeType } from 'prosemirror-model';
type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
export declare const toggleList: (listTypeOrName: string | NodeType, itemTypeOrName: string | NodeType) => Command;
export {};
