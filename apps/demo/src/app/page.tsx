"use client";

import { RichTextEditor } from "@inkstream/react-editor";
import { availablePlugins } from "@inkstream/editor-core";

export default function Home() {
  // Select only the plugins you want to use
  const selectedPlugins = [
    availablePlugins.bold,
    availablePlugins.italic,
    availablePlugins.underline,
    availablePlugins.strike,
    availablePlugins.code,
    availablePlugins.heading,
    availablePlugins.fontFamily,
    availablePlugins.alignLeft,
    availablePlugins.alignCenter,
    availablePlugins.alignRight,
    availablePlugins.indent,
    availablePlugins.bulletList,
    availablePlugins.orderedList,
    availablePlugins.listItem,
    availablePlugins.blockquote,
    availablePlugins.codeBlock,
    availablePlugins.image,
    availablePlugins.textColor,
    availablePlugins.highlight,
    availablePlugins.horizontalLine,
    availablePlugins.history,
    availablePlugins.linkBubble,
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Inkstream Demo</h1>
      <RichTextEditor 
        initialContent="<p>Hello world</p>" 
        plugins={selectedPlugins}
        pluginOptions={{
          fontFamily: {
            fontFamilies: ['Arial', 'Georgia', 'Helvetica', 'Tahoma', 'Times New Roman', 'Verdana']
          }
        }}
        toolbarLayout={[
          "undo", 
          "redo", 
          "|",
          "heading",
          "fontFamily", 
          "bold", 
          "italic", 
          "underline", 
          "strike", 
          "link",
          "|",
          "indent", 
          "outdent", 
          "|",
           "alignLeft",
          "alignCenter",
          "alignRight",
          "|",
          "bulletList", 
          "orderedList", 
          "codeBlock",
          "code", 
          "|",
          "image", 
          "textColor", 
          "highlight", 
          "|",
          "listItem", 
          "blockquote", 
          "horizontalLine", 
        ]}
      />
    </main>
  );
}