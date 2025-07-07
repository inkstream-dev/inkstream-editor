import { Node, NodeType } from 'prosemirror-model';
import { findParentNode as pmFindParentNode } from 'prosemirror-utils';

export const findParentNode = (predicate: (node: Node) => boolean) => (selection: any) => {
  return pmFindParentNode(predicate)(selection);
};

export const getNodeType = (nameOrType: string | NodeType, schema: any): NodeType => {
  if (typeof nameOrType === 'string') {
    if (!schema.nodes[nameOrType]) {
      throw new Error(`Node type '${nameOrType}' not found in schema.`);
    }
    return schema.nodes[nameOrType];
  }
  return nameOrType;
};

export const isList = (nodeTypeName: string): boolean => {
  return nodeTypeName === 'bullet_list' || nodeTypeName === 'ordered_list' || nodeTypeName === 'list_item';
};
