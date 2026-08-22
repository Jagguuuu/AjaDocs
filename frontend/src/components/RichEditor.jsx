import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import EditorToolbar from "./EditorToolbar";

export default function RichEditor({ content, onChange, documentId, editable = true }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [StarterKit, Underline],
    content: content || "",
    editorProps: {
      attributes: {
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.commands.setContent(content || "", false);
  }, [documentId, editor]);

  return (
    <div className="rich-editor">
      {editable ? <EditorToolbar editor={editor} /> : null}
      <div className="paper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
