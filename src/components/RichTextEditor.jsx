import { useEffect, useRef, useState } from "preact/hooks";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Heading1, Heading2, List, ListOrdered, Quote, Code, Undo2, Redo2, ImagePlus, Sigma, Video, X, Minus, Plus } from "lucide-preact";
import { CardImage, CardVideo, CardMath, CardTextStyle, AlignedParagraph, AlignedHeading } from "../services/editorExtensions";
import "katex/dist/katex.min.css";
const tools = [
  { label: "Bold", icon: Bold, run: e => e.chain().focus().toggleBold().run(), active: e => e.isActive("bold") },
  { label: "Italic", icon: Italic, run: e => e.chain().focus().toggleItalic().run(), active: e => e.isActive("italic") },
  { label: "Underline", icon: UnderlineIcon, run: e => e.chain().focus().toggleUnderline().run(), active: e => e.isActive("underline") },
  { label: "Heading 1", icon: Heading1, run: e => e.chain().focus().toggleHeading({ level: 1 }).run(), active: e => e.isActive("heading", { level: 1 }) },
  { label: "Heading 2", icon: Heading2, run: e => e.chain().focus().toggleHeading({ level: 2 }).run(), active: e => e.isActive("heading", { level: 2 }) },
  { label: "Heading 3", icon: Heading2, run: e => e.chain().focus().toggleHeading({ level: 3 }).run(), active: e => e.isActive("heading", { level: 3 }) },
  { label: "Heading 4", icon: Heading2, run: e => e.chain().focus().toggleHeading({ level: 4 }).run(), active: e => e.isActive("heading", { level: 4 }) },
  { label: "Heading 5", icon: Heading2, run: e => e.chain().focus().toggleHeading({ level: 5 }).run(), active: e => e.isActive("heading", { level: 5 }) },
  { label: "Bullet list", icon: List, run: e => e.chain().focus().toggleBulletList().run(), active: e => e.isActive("bulletList") },
  { label: "Numbered list", icon: ListOrdered, run: e => e.chain().focus().toggleOrderedList().run(), active: e => e.isActive("orderedList") },
  { label: "Quote", icon: Quote, run: e => e.chain().focus().toggleBlockquote().run(), active: e => e.isActive("blockquote") },
  { label: "Inline code", icon: Code, run: e => e.chain().focus().toggleCode().run(), active: e => e.isActive("code") },
];
const readImage = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(new Error("The image could not be read.")); reader.readAsDataURL(file); });
function videoTarget(value) {
  let url;
  try { url = new URL(value.trim()); } catch { return { error: "Enter a complete video link beginning with https:// or http://." }; }
  if (!["https:", "http:"].includes(url.protocol)) return { error: "Only web links beginning with https:// or http:// are supported." };
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") {
    const id = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
    return /^[\w-]{6,20}$/.test(id || "") ? { url: value.trim(), provider: "youtube" } : { error: "This YouTube link does not contain a valid video ID." };
  }
  if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
    const id = url.pathname.split("/").filter(Boolean).pop();
    return /^\d+$/.test(id || "") ? { url: value.trim(), provider: "vimeo" } : { error: "This Vimeo link does not contain a valid video ID." };
  }
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    const match = url.pathname.match(/^\/(reel|p|tv)\/([\w-]+)/i);
    return match ? { url: value.trim(), provider: "instagram" } : { error: "This Instagram link is not a supported post or reel. Copy the link to a public reel or post." };
  }
  if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch") return { url: value.trim(), provider: "facebook" };
  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return { url: value.trim(), provider: "direct" };
  return { error: "This video host does not provide a supported embed. Try YouTube, Instagram, Facebook, Vimeo, or a direct MP4/WebM/OGG link. Some providers block playback outside their own website." };
}
export default function RichTextEditor({ label, value = "", placeholder, onChange, media = [], onAddMedia }) {
  const hostRef = useRef(null), editorRef = useRef(null), fileRef = useRef(null), onChangeRef = useRef(onChange);
  const [revision, setRevision] = useState(0), [editor, setEditor] = useState(null), [dialog, setDialog] = useState(null), [dialogValue, setDialogValue] = useState(""), [mediaOpen, setMediaOpen] = useState(false);
  onChangeRef.current = onChange;
  useEffect(() => {
    const insertFiles = async (files, instance) => {
      const images = Array.from(files || []).filter(file => file.type?.startsWith("image/"));
      if (!images.length) return false;
      for (const file of images) {
        if (file.size > 12 * 1024 * 1024) { setDialog({ type: "notice", title: "Image is too large", message: `“${file.name}” exceeds the 12 MB image limit.` }); continue; }
        try { const asset = onAddMedia ? await onAddMedia(file) : { data: await readImage(file) }; const src = asset.id ? "memomedia://" + asset.id : asset.data; instance.chain().focus().setImage({ src, alt: asset.name || file.name.replace(/\.[^.]+$/, ""), width: 420, align: "center" }).run(); }
        catch (error) { setDialog({ type: "notice", title: "Could not paste image", message: error.message }); }
      }
      return true;
    };
    const instance = new Editor({
      element: hostRef.current,
      extensions: [StarterKit.configure({ paragraph: false, heading: false, undoRedo: { depth: 100 } }), AlignedParagraph, AlignedHeading, Markdown, Placeholder.configure({ placeholder: placeholder || "" }), Underline, CardTextStyle, Color, Link.configure({ openOnClick: false, autolink: true, protocols: ["http", "https"] }), CardImage.configure({ inline: true, allowBase64: true }), TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }), CardMath, CardVideo],
      content: value, contentType: "markdown",
      editorProps: {
        attributes: { class: "rich-editor-content", role: "textbox", "aria-label": label, "aria-multiline": "true", "data-placeholder": placeholder || "", spellcheck: "true" },
        handlePaste(view, event) {
          const files = Array.from(event.clipboardData?.items || []).filter(item => item.kind === "file").map(item => item.getAsFile()).filter(Boolean);
          if (!files.length) return false;
          insertFiles(files, instance).catch(() => {});
          return true;
        },
      },
      onUpdate: ({ editor: current }) => onChangeRef.current?.(current.getMarkdown()),
      onTransaction: () => setRevision(n => n + 1),
    });
    editorRef.current = instance; setEditor(instance);
    return () => { instance.destroy(); editorRef.current = null; setEditor(null); };
  }, []);
  void revision;
  async function insertImage(event) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file || !editor) return;
    if (!file.type.startsWith("image/")) { setDialog({ type: "notice", title: "Unsupported file", message: "Choose an image file such as PNG, JPEG, GIF or WebP." }); return; }
    if (file.size > 12 * 1024 * 1024) { setDialog({ type: "notice", title: "Image is too large", message: "Choose an image smaller than 12 MB." }); return; }
    try { const asset = onAddMedia ? await onAddMedia(file) : { data: await readImage(file) }; const src = asset.id ? "memomedia://" + asset.id : asset.data; editor.chain().focus().setImage({ src, alt: asset.name || file.name.replace(/\.[^.]+$/, ""), width: 420, align: "center" }).run(); }
    catch (error) { setDialog({ type: "notice", title: "Could not insert image", message: error.message }); }
  }
  function openInsert(type) { setDialogValue(""); setDialog({ type, title: type === "inlineMath" ? "Insert inline equation" : type === "blockMath" ? "Insert display equation" : type === "link" ? "Insert link" : "Insert video link card", message: type.includes("Math") ? "Enter a LaTeX expression." : type === "link" ? "Paste the destination URL for the selected text." : "Add a compact card that opens the video in your browser." }); }
  function submitInsert() {
    if (!editor || !dialogValue.trim()) { setDialog({ type: "notice", title: "Nothing to insert", message: "Enter an expression or video link first." }); return; }
    if (dialog.type === "inlineMath") editor.chain().focus().insertInlineMath({ latex: dialogValue.trim() }).run();
    if (dialog.type === "blockMath") editor.chain().focus().insertBlockMath({ latex: dialogValue.trim() }).run();
    if (dialog.type === "link") {
      let url; try { url = new URL(dialogValue.trim()); } catch { setDialog({ type: "notice", title: "Invalid link", message: "Enter a complete link beginning with https:// or http://." }); return; }
      if (!["http:", "https:"].includes(url.protocol)) { setDialog({ type: "notice", title: "Invalid link", message: "Only http and https links are supported." }); return; }
      editor.chain().focus().setLink({ href: url.href }).run();
    }
    if (dialog.type === "video") {
      const target = videoTarget(dialogValue);
      if (target.error) { setDialog({ type: "notice", title: "Unable to embed video", message: target.error }); return; }
      editor.chain().focus().insertContent({ type: "cardVideo", attrs: target }).run();
    }
    setDialog(null); setDialogValue("");
  }
  function align(placement) {
    if (editor?.isActive("image")) editor.chain().focus().updateAttributes("image", { align: placement }).run();
    else editor?.chain().focus().setTextAlign(placement).run();
  }
  function resize(delta) {
    if (!editor?.isActive("image")) { setDialog({ type: "notice", title: "Select an image first", message: "Click an image, then use the image size controls." }); return; }
    const width = Number(editor.getAttributes("image").width) || 420;
    editor.chain().focus().updateAttributes("image", { width: Math.max(60, Math.min(1200, width + delta)) }).run();
  }
  const imageSelected = !!editor?.isActive("image");
  return <section class="rich-editor">
    <div class="rich-editor-heading">{label}</div>
    <div class="rich-editor-toolbar" role="toolbar" aria-label={`${label} formatting`}>
      {tools.map(({ label: name, icon: Icon, run, active }) => <button type="button" class={`rich-editor-tool ${editor && active(editor) ? "is-active" : ""}`} title={name} aria-label={name} disabled={!editor} onMouseDown={e => e.preventDefault()} onClick={() => editor && run(editor)}><Icon size={15}/></button>)}
      <span class="rich-editor-divider"/>
      <button type="button" class="rich-editor-tool" title="Align left" aria-label="Align left" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>align("left")}><AlignLeft size={15}/></button>
      <button type="button" class="rich-editor-tool" title="Align centre" aria-label="Align centre" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>align("center")}><AlignCenter size={15}/></button>
      <button type="button" class="rich-editor-tool" title="Align right" aria-label="Align right" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>align("right")}><AlignRight size={15}/></button>
      <label class="rich-editor-size" title="Text size"><span>A</span><select aria-label="Text size" disabled={!editor} value={editor?.getAttributes("textStyle").fontSize || "14px"} onChange={e=>editor?.chain().focus().setMark("textStyle", { fontSize: e.currentTarget.value }).run()}><option value="12px">12</option><option value="14px">14</option><option value="16px">16</option><option value="18px">18</option><option value="20px">20</option><option value="24px">24</option><option value="28px">28</option><option value="32px">32</option><option value="36px">36</option></select></label><label class="rich-editor-color" title="Text colour"><input aria-label="Text colour" type="color" disabled={!editor} value={editor?.getAttributes("textStyle").color || "#386fae"} onInput={e=>editor?.chain().focus().setColor(e.currentTarget.value).run()}/></label>
      <button type="button" class="rich-editor-tool" title="Insert link" aria-label="Insert link" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>openInsert("link")}><LinkIcon size={15}/></button>
      <span class="rich-editor-divider"/>
      <button type="button" class="rich-editor-tool" title="Insert image" aria-label="Insert image" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>setMediaOpen(true)}><ImagePlus size={15}/></button>
      <button type="button" class="rich-editor-tool" title="Decrease image size" aria-label="Decrease image size" disabled={!editor || !imageSelected} onMouseDown={e=>e.preventDefault()} onClick={()=>resize(-60)}><Minus size={15}/></button>
      <button type="button" class="rich-editor-tool" title="Increase image size" aria-label="Increase image size" disabled={!editor || !imageSelected} onMouseDown={e=>e.preventDefault()} onClick={()=>resize(60)}><Plus size={15}/></button>
      <span class="rich-editor-divider"/>
      <button type="button" class="rich-editor-tool" title="Inline equation" aria-label="Inline equation" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>openInsert("inlineMath")}><Sigma size={15}/></button>
      <button type="button" class="rich-editor-tool" title="Display equation" aria-label="Display equation" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>openInsert("blockMath")}>∑</button>
      <button type="button" class="rich-editor-tool" title="Insert video link card" aria-label="Insert video link card" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>openInsert("video")}><Video size={15}/></button>
      <span class="rich-editor-divider"/>
      <button type="button" class="rich-editor-tool" title="Undo" aria-label="Undo" disabled={!editor?.can().undo()} onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().undo().run()}><Undo2 size={15}/></button>
      <button type="button" class="rich-editor-tool" title="Redo" aria-label="Redo" disabled={!editor?.can().redo()} onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().redo().run()}><Redo2 size={15}/></button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={insertImage}/>
    </div>
    <div class="rich-editor-surface"><div ref={hostRef}/></div>
    {mediaOpen && <div class="prompt-backdrop" onMouseDown={e=>e.target===e.currentTarget && setMediaOpen(false)}>
      <section class="prompt-panel media-library-dialog" role="dialog" aria-modal="true" aria-label="Media library">
        <div class="prompt-heading"><h2>Media library</h2><button type="button" aria-label="Close" onClick={()=>setMediaOpen(false)}><X size={16}/></button></div>
        <p>Choose an image already stored in this notebook, or add a new one to reuse across cards.</p>
        <div class="media-library-grid">{media.map(asset => <button type="button" class="media-library-item" key={asset.id} onClick={()=>{editor?.chain().focus().setImage({src:"memomedia://" + asset.id,alt:asset.name || "Image",width:420,align:"center"}).run();setMediaOpen(false);}}><img src={asset.data} alt={asset.name || "Stored media"}/><span>{asset.name || "Image"}</span></button>)}</div>
        <div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={()=>setMediaOpen(false)}>Close</button><button type="button" class="prompt-confirm" onClick={()=>fileRef.current?.click()}>Add image</button></div>
      </section>
    </div>}
    {dialog && <div class="prompt-backdrop" onMouseDown={e=>e.target===e.currentTarget && setDialog(null)}>
      <section class="prompt-panel rich-editor-insert-dialog" role="dialog" aria-modal="true" aria-label={dialog.title}>
        <div class="prompt-heading"><h2>{dialog.title}</h2><button type="button" aria-label="Close" onClick={()=>setDialog(null)}><X size={16}/></button></div>
        <p>{dialog.message}</p>
        {dialog.type !== "notice" && <textarea rows={dialog.type==="blockMath" ? 5 : 3} value={dialogValue} onInput={e=>setDialogValue(e.currentTarget.value)} placeholder={dialog.type.includes("Math") ? "\\frac{a+b}{c}" : dialog.type === "link" ? "https://example.com" : "https://www.instagram.com/reel/..."}/>}
        <div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={()=>setDialog(null)}>{dialog.type==="notice" ? "Close" : "Cancel"}</button>{dialog.type!=="notice" && <button type="button" class="prompt-confirm" onClick={submitInsert}>Insert</button>}</div>
      </section>
    </div>}
  </section>;
}
