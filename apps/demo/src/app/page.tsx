import { RichTextEditor } from "@inkstream/react-editor";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Inkstream Demo</h1>
      <RichTextEditor 
        initialContent="<p>Hello world</p>" 
        plugins={["bold", "underline", "italic", "strike", "alignLeft", "indent", "bulletList", "orderedList", "code", "undo", "link", "heading"]}
        toolbarLayout={[
          "undo", 
          "redo", 
          "|",
          "heading", 
          "bold", 
          "italic", 
          "underline", 
          "strike", 
          "|",
          "indent", 
          "outdent", 
          "|",
          "bulletList", 
          "orderedList", 
          "code", 
          "|",
          "image", 
          "textColor", 
          "highlight", 
          "|",
          "listItem", 
          "blockquote", 
          "horizontalLine", 
          "codeBlock",
          "link",
          "alignLeft",
        ]}
      />
    </main>
  );
}