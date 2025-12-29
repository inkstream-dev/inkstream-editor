import { Schema } from 'prosemirror-model';
import { PluginManager } from './plugins';
export declare const inkstreamSchema: (manager: PluginManager) => Schema<"paragraph" | "hard_break" | "blockquote" | "doc" | "image" | "heading" | "text", "code" | "strong" | "underline" | "em" | "strike" | "link">;
