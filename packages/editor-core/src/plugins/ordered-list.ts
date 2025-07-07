import { Schema } from 'prosemirror-model';
import { EditorState, Plugin as ProseMirrorPlugin, Transaction } from 'prosemirror-state';
import { wrapInList, sinkListItem, liftListItem, splitListItem } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { inputRules, InputRule } from 'prosemirror-inputrules';
import { Plugin, ToolbarItem } from './';
type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export const toggleOrderedList: Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => { const orderedListType = state.schema.nodes.ordered_list; const listItemType = state.schema.nodes.list_item; if (!orderedListType || !listItemType) { return false; } if (isOrderedListActive(state)) { return liftListItem(listItemType)(state, dispatch); } else { return wrapInList(orderedListType, {})(state, dispatch); } }; export const isOrderedListActive = (state: EditorState) => { const { $from, to } = state.selection; const orderedListType = state.schema.nodes.ordered_list; const listItemType = state.schema.nodes.list_item; if (!orderedListType || !listItemType) { return false; } let isActive = false; state.doc.nodesBetween($from.pos, to, (node) => { if (node.type === orderedListType) { isActive = true; return false; } }); return isActive; }; export const orderedListPlugin: Plugin = {
    name: 'orderedList', nodes: { ordered_list: { content: 'list_item+', group: 'block', parseDOM: [{ tag: 'ol' }], toDOM() { return ['ol', 0]; }, }, list_item: { content: 'paragraph block*', parseDOM: [{ tag: 'li' }], toDOM() { return ['li', 0]; }, defining: true, }, }, getProseMirrorPlugins: (schema: Schema): ProseMirrorPlugin[] => {
        const listItemType = schema.nodes.list_item; const keys: { [key: string]: Command } = { 'Shift-Control-7': toggleOrderedList, 'Mod-[': liftListItem(listItemType), 'Mod-]': sinkListItem(listItemType),  'Shift-Enter': (state, dispatch) => { dispatch?.(state.tr.replaceSelectionWith(state.schema.nodes.hard_break.create()).scrollIntoView()); return true; }, }; return [keymap(keys), inputRules({
            rules: [new InputRule(/^(\d+)\.\s$/, (state, match, start, end) => {
                let tr = state.tr.delete(start, end);
                const type = state.schema.nodes.ordered_list;
                const listItemType = state.schema.nodes.list_item;

                if (!type || !listItemType) {
                    return null;
                }

                if (isOrderedListActive(state)) {
                    liftListItem(listItemType)(state, (newTr) => { tr = newTr; });
                } else {
                    wrapInList(type, {})(state, (newTr) => { tr = newTr; });
                }
                return tr.docChanged ? tr : null;
            }),],
        }),];
    }, getToolbarItems: (schema: Schema): ToolbarItem[] => { return [{ id: 'orderedList', icon: '1.', tooltip: 'Numbered List', command: toggleOrderedList, isActive: isOrderedListActive, },]; },
};