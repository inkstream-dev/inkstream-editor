"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.headingPlugin = void 0;
const plugin_factory_1 = require("../../editor-core/src/plugins/plugin-factory");
const prosemirror_commands_1 = require("prosemirror-commands");
exports.headingPlugin = (0, plugin_factory_1.createPlugin)({
    name: 'heading',
    getKeymap: (schema) => {
        const keys = {};
        if (schema.nodes.heading) {
            keys['Ctrl-Alt-1'] = (0, prosemirror_commands_1.setBlockType)(schema.nodes.heading, { level: 1 });
        }
        return keys;
    },
    getToolbarItems: (schema) => {
        const items = [];
        if (schema.nodes.heading) {
            items.push({
                id: 'heading',
                icon: 'H',
                tooltip: 'Headings',
                type: 'dropdown',
                children: [
                    {
                        id: 'paragraph',
                        icon: 'Paragraph',
                        tooltip: 'Paragraph',
                        command: (0, prosemirror_commands_1.setBlockType)(schema.nodes.paragraph),
                        isActive: (state) => {
                            const { $from } = state.selection;
                            return $from.parent.hasMarkup(schema.nodes.paragraph);
                        },
                    },
                    {
                        id: 'heading1',
                        icon: 'Heading 1',
                        tooltip: 'Heading 1',
                        command: (0, prosemirror_commands_1.setBlockType)(schema.nodes.heading, { level: 1 }),
                        isActive: (state) => {
                            const { $from } = state.selection;
                            return $from.parent.hasMarkup(schema.nodes.heading, { level: 1 });
                        },
                    },
                    {
                        id: 'heading2',
                        icon: 'Heading 2',
                        tooltip: 'Heading 2',
                        command: (0, prosemirror_commands_1.setBlockType)(schema.nodes.heading, { level: 2 }),
                        isActive: (state) => {
                            const { $from } = state.selection;
                            return $from.parent.hasMarkup(schema.nodes.heading, { level: 2 });
                        },
                    },
                    {
                        id: 'heading3',
                        icon: 'Heading 3',
                        tooltip: 'Heading 3',
                        command: (0, prosemirror_commands_1.setBlockType)(schema.nodes.heading, { level: 3 }),
                        isActive: (state) => {
                            const { $from } = state.selection;
                            return $from.parent.hasMarkup(schema.nodes.heading, { level: 3 });
                        },
                    },
                    {
                        id: 'heading4',
                        icon: 'Heading 4',
                        tooltip: 'Heading 4',
                        command: (0, prosemirror_commands_1.setBlockType)(schema.nodes.heading, { level: 4 }),
                        isActive: (state) => {
                            const { $from } = state.selection;
                            return $from.parent.hasMarkup(schema.nodes.heading, { level: 4 });
                        },
                    },
                    {
                        id: 'heading5',
                        icon: 'Heading 5',
                        tooltip: 'Heading 5',
                        command: (0, prosemirror_commands_1.setBlockType)(schema.nodes.heading, { level: 5 }),
                        isActive: (state) => {
                            const { $from } = state.selection;
                            return $from.parent.hasMarkup(schema.nodes.heading, { level: 5 });
                        },
                    },
                    {
                        id: 'heading6',
                        icon: 'Heading 6',
                        tooltip: 'Heading 6',
                        command: (0, prosemirror_commands_1.setBlockType)(schema.nodes.heading, { level: 6 }),
                        isActive: (state) => {
                            const { $from } = state.selection;
                            return $from.parent.hasMarkup(schema.nodes.heading, { level: 6 });
                        },
                    },
                ],
            });
        }
        return items;
    },
});
