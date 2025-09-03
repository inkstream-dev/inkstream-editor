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
import { textColorPlugin } from './plugins/textColor';
import { highlightPlugin } from './plugins/highlight';
import { codeBlockPlugin } from './plugins/codeBlock';
import { LinkBubbleWrapperPlugin } from './plugins/link-bubble-wrapper';
import { fontFamilyPlugin } from '../../font-family/src/font-family';


import { inkstreamSchema } from './schema';
export { inkstreamSchema };

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
const buildKeymap = (schema: Schema, manager: PluginManager) => {
  const keys: { [key: string]: any } = {};

  // Add base keymap commands
  Object.assign(keys, baseKeymap);

  // Add keymaps from plugins
  manager.getPlugins().forEach(plugin => {
    const keymap = plugin.getKeymap?.(schema);
    if (keymap) {
      Object.assign(keys, keymap);
    }
  });

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
  textColor: () => textColorPlugin,
  highlight: () => highlightPlugin,
  codeBlockPlugin: () => codeBlockPlugin,
  linkBubble: () => new LinkBubbleWrapperPlugin(),
  fontFamily: () => fontFamilyPlugin,
};

// Register all plugins with the manager
Object.values(pluginLoader).forEach(pluginFactory => {
  const loadedPlugin = pluginFactory();
  if (loadedPlugin) {
    pluginManager.registerPlugin(loadedPlugin);
  }
});

export const inkstreamPlugins = (manager: PluginManager) => {
  const schema = inkstreamSchema(manager);

  return [
    ...manager.getProseMirrorPlugins(schema),
    buildInputRules(schema),
    buildKeymap(schema, manager),
  ];
};

export type { Plugin, ToolbarItem };
export { pluginLoader };