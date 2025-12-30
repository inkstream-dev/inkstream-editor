import { Schema } from 'prosemirror-model';
import { PluginManager } from './plugins';
export declare const inkstreamSchema: (manager: PluginManager) => Schema<"paragraph" | "blockquote" | "doc" | "image" | "heading" | "text" | "hard_break", "code" | "strong" | "underline" | "em" | "strike" | "link">;
