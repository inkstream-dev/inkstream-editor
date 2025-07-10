import { Plugin, ToolbarItem } from '../plugins';
import { Schema } from 'prosemirror-model';
import { Plugin as ProseMirrorPlugin } from 'prosemirror-state';
import { linkBubblePlugin, getLinkBubbleToolbarItem } from '@inkstream/link-bubble';

export class LinkBubbleWrapperPlugin implements Plugin {
  name = 'linkBubble';

  getProseMirrorPlugins(schema: Schema): ProseMirrorPlugin[] {
    console.log("LinkBubbleWrapperPlugin: getProseMirrorPlugins called.");
    return [linkBubblePlugin];
  }

  getToolbarItems(schema: Schema): ToolbarItem[] {
    return [getLinkBubbleToolbarItem(schema)];
  }
}
