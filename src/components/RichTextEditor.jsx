import { useEffect, useRef, useState } from "preact/hooks";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered,
  Quote, Code, Undo2, Redo2,
} from "lucide-preact";

const tools = [
  { label: "Bold", icon: Bold, run: (editor) => editor.chain().focus().toggleBold().run(), active: (editor) => editor.isActive("bold") },
  { label: "Italic", icon: Italic, run: (editor) => editor.chain().focus().toggleItalic().run(), active: (editor) => editor.isActive("italic") },
  { label: "Heading 1", icon: Heading1, run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: (editor) => editor.isActive("heading", { level: 1 }) },
  { label: "Heading 2", icon: Heading2, run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: (editor) => editor.isActive("heading", { level: 2 }) },
  { label: "Bullet list", icon: List, run: (editor) => editor.chain().focus().toggleBulletList().run(), active: (editor) => editor.isActive("bulletList") },
  { label: "Numbered list", icon: ListOrdered, run: (editor) => editor.chain().focus().toggleOrderedList().run(), active: (editor) => editor.isActive("orderedList") },
  { label: "Quote", icon: Quote, run: (editor) => editor.chain().focus().toggleBlockquote().run(), active: (editor) => editor.isActive("blockquote") },
  { label: "Inline code", icon: Code, run: (editor) => editor.chain().focus().toggleCode().run(), active: (editor) => editor.isActive("code") },
];

export default function RichTextEditor({ label, value = "", placeholder, onChange }) {
  const hostRef = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [revision, setRevision] = useState(0);
  onChangeRef.current = onChange;

  useEffect(() => {
    const editor = new Editor({
      element: hostRef.current,
      extensions: [StarterKit, Markdown],
      content: value,
      contentType: "markdown",
      editorProps: {
        attributes: {
          class: "rich-editor-content",
          role: "textbox",
          "aria-label": label,
          "aria-multiline": "true",
          "data-placeholder": placeholder || "",
          spellcheck: "true",
        },
      },
      onUpdate: ({ editor: current }) => onChangeRef.current?.(current.getMarkdown()),
      onSelectionUpdate: () => setRevision((current) => current + 1),
      onTransaction: () => setRevision((current) => current + 1),
    });

    editorRef.current = editor;
    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  const editor = editorRef.current;

  return (
    <section class="rich-editor">
      <div class="rich-editor-heading">{label}</div>
      <div class="rich-editor-toolbar" role="toolbar" aria-label={`${label} formatting`}>
        {tools.map(({ label: toolLabel, icon: Icon, run, active }) => (
          <button
            type="button"
            class={`rich-editor-tool ${editor && active(editor) ? "is-active" : ""}`}
            title={toolLabel}
            aria-label={toolLabel}
            aria-pressed={editor ? active(editor) : false}
            disabled={!editor}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor && run(editor)}
          >
            <Icon size={15} />
          </button>
        ))}
        <span class="rich-editor-divider" />
        <button type="button" class="rich-editor-tool" title="Undo" aria-label="Undo" disabled={!editor?.can().undo()} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </button>
        <button type="button" class="rich-editor-tool" title="Redo" aria-label="Redo" disabled={!editor?.can().redo()} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </button>
      </div>
      <div class="rich-editor-surface">
        <div ref={hostRef} />
      </div>
    </section>
  );
}
