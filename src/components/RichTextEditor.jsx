import { useEffect, useRef, useState } from "preact/hooks";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { AlignCenter, AlignRight, Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Code, Undo2, Redo2, ImagePlus, Sigma, Video, X } from "lucide-preact";
import { CardImage, CardVideo, CardMath, AlignedParagraph, AlignedHeading } from "../services/editorExtensions";
import "katex/dist/katex.min.css";

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
  const fileRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [revision, setRevision] = useState(0);
  const [editorInstance, setEditorInstance] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [dialogValue, setDialogValue] = useState("");
  onChangeRef.current = onChange;

  useEffect(() => {
    const editor = new Editor({
      element: hostRef.current,
      extensions: [
        StarterKit.configure({ paragraph: false, heading: false }), AlignedParagraph, AlignedHeading, Markdown, Placeholder.configure({ placeholder: placeholder || "" }),
        CardImage.configure({ inline: false, allowBase64: true }),
        TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
        CardMath, CardVideo,
      ],
      content: value,
      contentType: "markdown",
      editorProps: {
        attributes: {
          class: "rich-editor-content", role: "textbox", "aria-label": label,
          "aria-multiline": "true", "data-placeholder": placeholder || "", spellcheck: "true",
        },
      },
      onUpdate: ({ editor: current }) => onChangeRef.current?.(current.getMarkdown()),
      onSelectionUpdate: () => setRevision((current) => current + 1),
      onTransaction: () => setRevision((current) => current + 1),
    });
    editorRef.current = editor;
    setEditorInstance(editor);
    return () => {
      editor.destroy();
      editorRef.current = null;
      setEditorInstance(null);
    };
  }, []);

  const editor = editorInstance;
  void revision;

  function insertImage(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !editor) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 12 * 1024 * 1024) {
      setDialog({ type: "notice", title: "Image is too large", message: "Choose an image smaller than 12 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      if (src.startsWith("data:image/")) editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, "") }).run();
    };
    reader.readAsDataURL(file);
  }

  function openInsert(type) {
    setDialogValue("");
    setDialog({ type, title: type === "inlineMath" ? "Insert inline equation" : type === "blockMath" ? "Insert equation" : "Embed video", message: type.includes("Math") ? "Enter a LaTeX expression." : "Paste a public video URL." });
  }

  function submitInsert() {
    if (!editor || !dialogValue.trim()) return;
    if (dialog.type === "inlineMath") editor.chain().focus().insertInlineMath({ latex: dialogValue.trim() }).run();
    if (dialog.type === "blockMath") editor.chain().focus().insertBlockMath({ latex: dialogValue.trim() }).run();
    if (dialog.type === "video") {
      const url = dialogValue.trim();
      if (!/^https?:\/\//i.test(url)) return;
      editor.chain().focus().insertContent({ type: "cardVideo", attrs: { url } }).run();
    }
    setDialog(null);
    setDialogValue("");
  }

  return (
    <section class="rich-editor">
      <div class="rich-editor-heading">{label}</div>
      <div class="rich-editor-toolbar" role="toolbar" aria-label={`${label} formatting`}>
        {tools.map(({ label: toolLabel, icon: Icon, run, active }) => (
          <button type="button" class={`rich-editor-tool ${editor && active(editor) ? "is-active" : ""}`} title={toolLabel} aria-label={toolLabel} aria-pressed={editor ? active(editor) : false} disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor && run(editor)}>
            <Icon size={15} />
          </button>
        ))}
        <span class="rich-editor-divider" />
        <button type="button" class="rich-editor-tool" title="Align centre" aria-label="Align centre" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().setTextAlign("center").run()}><AlignCenter size={15} /></button>
        <button type="button" class="rich-editor-tool" title="Align right" aria-label="Align right" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().setTextAlign("right").run()}><AlignRight size={15} /></button>
        <button type="button" class="rich-editor-tool" title="Align left" aria-label="Align left" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>L</button>
        <span class="rich-editor-divider" />
        <button type="button" class="rich-editor-tool" title="Insert image" aria-label="Insert image" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => fileRef.current?.click()}><ImagePlus size={15} /></button>
        <button type="button" class="rich-editor-tool" title="Inline equation" aria-label="Insert inline equation" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => openInsert("inlineMath")}><Sigma size={15} /></button>
        <button type="button" class="rich-editor-tool" title="Block equation" aria-label="Insert block equation" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => openInsert("blockMath")}>∑</button>
        <button type="button" class="rich-editor-tool" title="Embed video" aria-label="Embed video" disabled={!editor} onMouseDown={(event) => event.preventDefault()} onClick={() => openInsert("video")}><Video size={15} /></button>
        <span class="rich-editor-divider" />
        <button type="button" class="rich-editor-tool" title="Undo" aria-label="Undo" disabled={!editor?.can().undo()} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={15} /></button>
        <button type="button" class="rich-editor-tool" title="Redo" aria-label="Redo" disabled={!editor?.can().redo()} onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={15} /></button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={insertImage} />
      </div>
      <div class="rich-editor-surface"><div ref={hostRef} /></div>
      {dialog && (
        <div class="prompt-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          <section class="prompt-panel rich-editor-insert-dialog" role="dialog" aria-modal="true" aria-label={dialog.title}>
            <div class="prompt-heading"><h2>{dialog.title}</h2><button type="button" aria-label="Close" onClick={() => setDialog(null)}><X size={16} /></button></div>
            <p>{dialog.message}</p>
            <textarea rows={dialog.type === "blockMath" ? 5 : 3} value={dialogValue} onInput={(event) => setDialogValue(event.currentTarget.value)} placeholder={dialog.type.includes("Math") ? "\\frac{a+b}{c}" : "https://www.youtube.com/watch?v=..."} />
            <div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={() => setDialog(null)}>Cancel</button><button type="button" class="prompt-confirm" disabled={!dialogValue.trim()} onClick={submitInsert}>Insert</button></div>
          </section>
        </div>
      )}
    </section>
  );
}
