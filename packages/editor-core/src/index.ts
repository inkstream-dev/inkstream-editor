import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { history } from 'prosemirror-history';
import { inputRules, wrappingInputRule, textblockTypeInputRule, smartQuotes, emDash, ellipsis } from 'prosemirror-inputrules';
import { PluginManager, Plugin } from './plugins';
import { boldPlugin } from './plugins/bold';
import { imagePlugin } from './plugins/image';

// Define a more comprehensive schema for a rich text editor
export const inkstreamSchema = new Schema({
  nodes: {
    doc: { content: "block+", toDOM() { return ["div", 0]; } },
    paragraph: { content: "inline*", group: "block", toDOM() { return ["p", 0]; } },
    blockquote: { content: "block+", group: "block", toDOM() { return ["blockquote", 0]; } },
    horizontal_rule: { group: "block", toDOM() { return ["hr"]; } },
    heading: {
      attrs: { level: { default: 1 } },
      content: "inline*",
      group: "block",
      toDOM(node) { return ["h" + node.attrs.level, 0]; },
    },
    code_block: { content: "text*", marks: "", group: "block", toDOM() { return ["pre", ["code", 0]]; } },
    text: { inline: true, group: "inline", toDOM(node) { return node.text || ""; } },
    hard_break: { inline: true, group: "inline", selectable: false, toDOM() { return ["br"]; } },

    // Inline nodes
    image: {
      inline: true,
      attrs: {
        src: { default: null },
        alt: { default: null },
        title: { default: null },
      },
      group: "inline",
      draggable: true,
      toDOM(node) { return ["img", node.attrs]; },
    },
  },

  marks: {
    link: {
      attrs: {
        href: { default: null },
        title: { default: null },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs(dom) {
            return { href: dom.getAttribute("href"), title: dom.getAttribute("title") };
          },
        },
      ],
      toDOM(node) {
        return ["a", node.attrs];
      },
    },
    strong: { toDOM() { return ["strong", 0]; } },
    em: { toDOM() { return ["em", 0]; } },
    underline: { toDOM() { return ["u", 0]; } },
    strike: { toDOM() { return ["s", 0]; } },
    code: { toDOM() { return ["code", 0]; } },
  },
});

// Input rules
const buildInputRules = (schema: Schema) => {
  const rules = smartQuotes.concat(ellipsis, emDash);

  // Rule for headings (e.g., # Heading)
  rules.push(textblockTypeInputRule(/^#+\s$/, schema.nodes.heading, (match) => ({ level: match[0].length - 1 })));

  // Rule for blockquotes (e.g., > Quote)
  rules.push(wrappingInputRule(/^>\s$/, schema.nodes.blockquote));

  // Rule for code blocks (e.g., ``` Code)
  rules.push(textblockTypeInputRule(/^```\s$/, schema.nodes.code_block));

  return inputRules({
    rules,
  });
};

// Keymap
const buildKeymap = (schema: Schema) => {
  const keys: { [key: string]: any } = {};

  // Add base keymap commands
  Object.assign(keys, baseKeymap);

  // Add custom keybindings
  // Example: Ctrl-b for bold
  keys["Mod-b"] = toggleMark(schema.marks.strong);

  return keymap(keys);
};

export const inkstreamPlugins = (schema: Schema) => [
  buildInputRules(schema),
  buildKeymap(schema),
  history(),
];

export const pluginManager = new PluginManager();

// Centralized plugin loader for dynamic imports
const pluginLoader = {
  bold: () => import('./plugins/bold').then(m => m.boldPlugin),
  image: () => import('./plugins/image').then(m => m.imagePlugin),
};

export type { Plugin };
export { pluginLoader };
