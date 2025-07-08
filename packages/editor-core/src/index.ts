import { Schema } from 'prosemirror-model';
import { EditorState, Transaction } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, splitBlock, chainCommands } from 'prosemirror-commands';
import { splitListItem, liftListItem } from 'prosemirror-schema-list';
import { history } from 'prosemirror-history';
import { inputRules, wrappingInputRule, textblockTypeInputRule, smartQuotes, emDash, ellipsis, InputRule } from 'prosemirror-inputrules';
import { PluginManager, Plugin, ToolbarItem } from './plugins';


// Import all plugin instances directly
import { boldPlugin } from './plugins/bold';
import { underlinePlugin } from './plugins/underline';
import { italicPlugin } from './plugins/italic';
import { strikePlugin } from './plugins/strike';
import { alignLeftPlugin } from './plugins/align-left';
import { imagePlugin } from './plugins/image';
import { indentPlugin } from './plugins/indent';
import { bulletListPlugin } from './plugins/bullet-list';
import { orderedListPlugin } from './plugins/ordered-list';
import { codePlugin } from './plugins/code';
import { historyPlugin } from './plugins/history';
import { listItemPlugin } from './plugins/list-item';
import { BlockquotePlugin } from './plugins/blockquote';
import { headingPlugin } from '../../heading/src/heading';
import { horizontalLinePlugin } from './plugins/horizontal-line';

// Define a more comprehensive schema for a rich text editor
export const inkstreamSchema = (manager: PluginManager) => new Schema({
  nodes: {
    doc: { content: "block+", toDOM() { return ["div", 0]; } },
    paragraph: {
      content: "inline*",
      group: "block",
      attrs: {
        align: { default: null },
        indent: { default: 0 }, // Add indent attribute
      },
      toDOM(node) {
        const attrs: { [key: string]: string } = {};
        if (node.attrs.align) {
          attrs.style = `text-align: ${node.attrs.align}`;
        }
        if (node.attrs.indent) {
          attrs.style = `${attrs.style || ''} padding-left: ${node.attrs.indent * 20}px;`; // Example: 20px per indent level
        }
        return ["p", attrs, 0];
      },
    },
    blockquote: { content: "block+", group: "block", toDOM() { return ["blockquote", 0]; } },
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
    ...manager.getNodes(), // Dynamically add nodes from plugins
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
    ...manager.getMarks(), // Dynamically add marks from plugins
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

  // Rules for bold
  rules.push(new InputRule(/\*\*([^*]+)\*\*$/, (state, match, start, end) => {
    const tr = state.tr;
    if (match[1]) {
      const textStart = start + match[0].indexOf(match[1]);
      const textEnd = textStart + match[1].length;
      tr.delete(textStart, textEnd);
      tr.addMark(textStart, textEnd, schema.marks.strong.create());
    }
    return tr;
  }));

  rules.push(new InputRule(/__([^_]+)__$/, (state, match, start, end) => {
    const tr = state.tr;
    if (match[1]) {
      const textStart = start + match[0].indexOf(match[1]);
      const textEnd = textStart + match[1].length;
      tr.delete(textStart, textEnd);
      tr.addMark(textStart, textEnd, schema.marks.strong.create());
    }
    return tr;
  }));

  return inputRules({
    rules,
  });
};

// Keymap
const buildKeymap = (schema: Schema) => {
  const keys: { [key: string]: any } = {};

  // Add base keymap commands
  Object.assign(keys, baseKeymap);

  // Add keybinding for hard breaks (Shift-Enter)
  keys["Shift-Enter"] = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView());
    }
    return true;
  };

  // Add keybinding for creating a new paragraph (Enter)
  keys["Enter"] = chainCommands(splitListItem(schema.nodes.list_item), liftListItem(schema.nodes.list_item), splitBlock);

  return keymap(keys);
};

export const pluginManager = new PluginManager();

// Centralized plugin loader for dynamic imports
const pluginLoader = {
  bold: () => boldPlugin,
  underline: () => underlinePlugin,
  italic: () => italicPlugin,
  strike: () => strikePlugin,
  alignLeft: () => alignLeftPlugin,
  image: () => imagePlugin,
  indent: () => indentPlugin,
  bulletList: () => bulletListPlugin,
  orderedList: () => orderedListPlugin,
  code: () => codePlugin,
  history: () => historyPlugin,
  listItem: () => listItemPlugin,
  heading: () => headingPlugin,
  blockquote: () => new BlockquotePlugin(),
  horizontalLine: () => horizontalLinePlugin,
};

// Register all plugins with the manager
Object.values(pluginLoader).forEach(plugin => {
  pluginManager.registerPlugin(plugin());
});

export const inkstreamPlugins = (manager: PluginManager) => {
  const schema = inkstreamSchema(manager);

  return [
    ...manager.getProseMirrorPlugins(schema),
    buildInputRules(schema),
    buildKeymap(schema),
  ];
};

export type { Plugin, ToolbarItem };
export { pluginLoader };