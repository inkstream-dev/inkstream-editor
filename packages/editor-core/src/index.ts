import { Schema } from 'prosemirror-model';

// Define a simple schema for a basic rich text editor
export const inkstreamSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    text: { inline: true, group: "inline" }, // Add group: "inline"
  },
  marks: {
    strong: {},
    em: {},
  },
});
