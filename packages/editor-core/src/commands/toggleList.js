"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleList = void 0;
const prosemirror_schema_list_1 = require("prosemirror-schema-list");
const prosemirror_1 = require("../helpers/prosemirror");
const toggleList = (listTypeOrName, itemTypeOrName) => {
    return (state, dispatch) => {
        const listType = (0, prosemirror_1.getNodeType)(listTypeOrName, state.schema);
        const itemType = (0, prosemirror_1.getNodeType)(itemTypeOrName, state.schema);
        if (!listType || !itemType) {
            return false;
        }
        const { selection, tr } = state;
        const parentList = (0, prosemirror_1.findParentNode)(node => (0, prosemirror_1.isList)(node.type.name))(selection);
        // Scenario 1: If already in the target list type, toggle off (lift)
        if (parentList && parentList.node.type === listType) {
            // First, try to lift the list item.
            // If it can't be lifted, it means it's a top-level list item.
            if ((0, prosemirror_schema_list_1.liftListItem)(itemType)(state, dispatch)) {
                return true;
            }
            // If lifting didn't work, try to convert it to a paragraph.
            // This is the action that effectively "removes" the list.
            const { $from, $to } = selection;
            const range = $from.blockRange($to);
            if (range && dispatch) {
                const paragraph = state.schema.nodes.paragraph;
                if (paragraph) {
                    const mapping = tr.mapping;
                    tr.setBlockType(range.start, range.end, paragraph);
                    const from = mapping.map(range.start);
                    const to = mapping.map(range.end);
                    tr.doc.nodesBetween(from, to, (node, pos) => {
                        if (node.type === listType) {
                            const $pos = tr.doc.resolve(pos);
                            const listRange = $pos.blockRange();
                            if (listRange) {
                                tr.setBlockType(listRange.start, listRange.end, paragraph);
                            }
                        }
                    });
                    dispatch(tr.scrollIntoView());
                    return true;
                }
            }
            // Fallback to original liftListItem if conversion is not possible
            return (0, prosemirror_schema_list_1.liftListItem)(itemType)(state, dispatch);
        }
        // Scenario 2: If in a different list type, convert it
        if (parentList && parentList.node.type !== listType) {
            // First, lift out of the current list
            let currentTr = tr;
            const liftCommand = (0, prosemirror_schema_list_1.liftListItem)(itemType);
            if (liftCommand(state, (tempTr) => { currentTr = tempTr; })) {
                // Then, wrap into the new list type
                const stateAfterLift = state.apply(currentTr);
                const wrapCommand = (0, prosemirror_schema_list_1.wrapInList)(listType);
                if (wrapCommand(stateAfterLift, (tempTr) => {
                    tempTr.steps.forEach(step => { currentTr = currentTr.step(step); });
                })) {
                    if (dispatch) {
                        dispatch(currentTr);
                    }
                    return true;
                }
            }
            return false;
        }
        // Scenario 3: If not in any list, toggle on (wrap)
        return (0, prosemirror_schema_list_1.wrapInList)(listType)(state, dispatch);
    };
};
exports.toggleList = toggleList;
