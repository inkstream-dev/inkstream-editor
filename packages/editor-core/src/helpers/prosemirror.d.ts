import { Node, NodeType } from 'prosemirror-model';
export declare const findParentNode: (predicate: (node: Node) => boolean) => (selection: any) => import("prosemirror-utils/dist/types").FindResult;
export declare const getNodeType: (nameOrType: string | NodeType, schema: any) => NodeType;
export declare const isList: (nodeTypeName: string) => boolean;
