import { Schema } from '@inkstream/pm/model';
import { inputRules, wrappingInputRule, textblockTypeInputRule, smartQuotes, emDash, ellipsis, InputRule } from '@inkstream/pm/inputrules';

/**
 * Builds the default set of ProseMirror input rules for Inkstream.
 *
 * Includes:
 * - Smart typography (quotes, em-dash, ellipsis)
 * - Markdown-style shortcuts: `#` for headings, `>` for blockquote, ` ``` ` for code block
 * - `**text**` / `__text__` → bold mark
 *
 * Plugin packages may contribute additional input rules via `getInputRules()` in
 * their `createPlugin` config. Those are collected by `PluginManager` and included
 * in the full plugin set built by `InkstreamEditor`.
 */
export const buildInputRules = (schema: Schema) => {
  const rules = smartQuotes.concat(ellipsis, emDash);

  if (schema.nodes.heading) {
    rules.push(textblockTypeInputRule(/^#+\s$/, schema.nodes.heading, (match) => ({ level: match[0].length - 1 })));
  }

  if (schema.nodes.blockquote) {
    rules.push(wrappingInputRule(/^>\s$/, schema.nodes.blockquote));
  }

  if (schema.nodes.code_block) {
    rules.push(textblockTypeInputRule(/^```\s$/, schema.nodes.code_block));
  }

  if (schema.marks.strong) {
    rules.push(new InputRule(/\*\*([^*]+)\*\*$/, (state, match, start) => {
      const tr = state.tr;
      if (match[1]) {
        const textStart = start + match[0].indexOf(match[1]);
        const textEnd = textStart + match[1].length;
        tr.delete(textStart, textEnd);
        tr.addMark(textStart, textEnd, schema.marks.strong.create());
      }
      return tr;
    }));

    rules.push(new InputRule(/__([^_]+)__$/, (state, match, start) => {
      const tr = state.tr;
      if (match[1]) {
        const textStart = start + match[0].indexOf(match[1]);
        const textEnd = textStart + match[1].length;
        tr.delete(textStart, textEnd);
        tr.addMark(textStart, textEnd, schema.marks.strong.create());
      }
      return tr;
    }));
  }

  return inputRules({ rules });
};
