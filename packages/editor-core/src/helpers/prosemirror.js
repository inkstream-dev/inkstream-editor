"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isList = exports.getNodeType = exports.findParentNode = void 0;
const prosemirror_utils_1 = require("prosemirror-utils");
const findParentNode = (predicate) => (selection) => {
    return (0, prosemirror_utils_1.findParentNode)(predicate)(selection);
};
exports.findParentNode = findParentNode;
const getNodeType = (nameOrType, schema) => {
    if (typeof nameOrType === 'string') {
        if (!schema.nodes[nameOrType]) {
            throw new Error(`Node type '${nameOrType}' not found in schema.`);
        }
        return schema.nodes[nameOrType];
    }
    return nameOrType;
};
exports.getNodeType = getNodeType;
const isList = (nodeTypeName) => {
    return nodeTypeName === 'bullet_list' || nodeTypeName === 'ordered_list';
};
exports.isList = isList;
