import { RichTextEditor } from "@inkstream/react-editor";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Inkstream Demo</h1>
      <RichTextEditor initialContent="<p>Hello world</p>"  />
    </main>
  );
}