import { useEffect, useRef, useState } from "preact/hooks";
import { Editor } from "@tiptap/core";


import Placeholder from "@tiptap/extension-placeholder";



import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Heading1, Heading2, Heading3, Heading4, Heading5, List, ListOrdered, Quote, Code, Undo2, Redo2, ImagePlus, Sigma, Video, X, Minus, Plus, Pilcrow } from "lucide-preact";
import { createCardExtensions } from "../services/editorExtensions";
import { normalizeCardDocument } from "../services/cardDocument";

import "katex/dist/katex.min.css";
const tools = [
  { label: "Normal text", icon: Pilcrow, run: e => e.chain().focus().setParagraph().run(), active: e => e.isActive("paragraph") },
  { label: "Bold", icon: Bold, run: e => e.chain().focus().toggleBold().run(), active: e => e.isActive("bold") },
  { label: "Italic", icon: Italic, run: e => e.chain().focus().toggleItalic().run(), active: e => e.isActive("italic") },
  { label: "Underline", icon: UnderlineIcon, run: e => e.chain().focus().toggleUnderline().run(), active: e => e.isActive("underline") },
  { label: "Heading 1", icon: Heading1, run: e => e.chain().focus().setHeading({ level: 1 }).run(), active: e => e.isActive("heading", { level: 1 }) },
  { label: "Heading 2", icon: Heading2, run: e => e.chain().focus().setHeading({ level: 2 }).run(), active: e => e.isActive("heading", { level: 2 }) },
  { label: "Heading 3", icon: Heading3, run: e => e.chain().focus().setHeading({ level: 3 }).run(), active: e => e.isActive("heading", { level: 3 }) },
  { label: "Heading 4", icon: Heading4, run: e => e.chain().focus().setHeading({ level: 4 }).run(), active: e => e.isActive("heading", { level: 4 }) },
  { label: "Heading 5", icon: Heading5, run: e => e.chain().focus().setHeading({ level: 5 }).run(), active: e => e.isActive("heading", { level: 5 }) },
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
  const hostRef = useRef(null), editorRef = useRef(null), fileRef = useRef(null), onChangeRef = useRef(onChange), onAddMediaRef = useRef(onAddMedia), mediaRef = useRef(media);
  mediaRef.current = media;
  const mapDocumentMedia = (node, direction) => {
    if (!node || typeof node !== "object") return node;
    const next = { ...node };
    if (next.attrs?.src) {
      const asset = mediaRef.current.find(item => item?.id && (direction === "editor" ? next.attrs.src === "memomedia://" + item.id : next.attrs.src === item.data));
      if (asset) next.attrs = { ...next.attrs, src: direction === "editor" ? asset.data : "memomedia://" + asset.id };
    }
    if (Array.isArray(next.content)) next.content = next.content.map(child => mapDocumentMedia(child, direction));
    return next;
  };
  const toEditorDocument = source => mapDocumentMedia(normalizeCardDocument(source), "editor");
  const toStoredDocument = source => mapDocumentMedia(source, "stored");
  const cacheMediaAsset = asset => {
    if (asset?.id) mediaRef.current = [...mediaRef.current.filter(item => item.id !== asset.id), asset];
    return asset;
  };
  const [revision, setRevision] = useState(0), [editor, setEditor] = useState(null), [dialog, setDialog] = useState(null), [dialogValue, setDialogValue] = useState(""), [dialogText, setDialogText] = useState(""), [insertMenu, setInsertMenu] = useState(false), [insertQuery, setInsertQuery] = useState("");
  onChangeRef.current = onChange;
  onAddMediaRef.current = onAddMedia;
  useEffect(() => {
    const insertFiles = async (files, instance) => {
      const images = Array.from(files || []).filter(file => file.type?.startsWith("image/"));
      if (!images.length) return false;
      for (const file of images) {
        if (file.size > 12 * 1024 * 1024) { setDialog({ type: "notice", title: "Image is too large", message: `“${file.name}” exceeds the 12 MB image limit.` }); continue; }
        try { const asset = cacheMediaAsset(onAddMediaRef.current ? await onAddMediaRef.current(file) : { data: await readImage(file) }); const src = asset.data || (asset.id ? "memomedia://" + asset.id : ""); instance.chain().focus().setImage({ src, alt: asset.name || file.name.replace(/\.[^.]+$/, ""), width: 420 }).run(); }
        catch (error) { setDialog({ type: "notice", title: "Could not paste image", message: error.message }); }
      }
      return true;
    };
    const instance = new Editor({
      element: hostRef.current,
      extensions: [...createCardExtensions(), Placeholder.configure({ placeholder: placeholder || "" })],
      content: toEditorDocument(value), contentType: "json",
      editorProps: {
        attributes: { class: "rich-editor-content", role: "textbox", "aria-label": label, "aria-multiline": "true", "data-placeholder": placeholder || "", spellcheck: "true" },
        handlePaste(view, event) {
          const files = Array.from(event.clipboardData?.items || []).filter(item => item.kind === "file").map(item => item.getAsFile()).filter(Boolean);
          if (files.length) {
            insertFiles(files, instance).catch(() => {});
            return true;
          }
          const pastedText = event.clipboardData?.getData("text/plain") || "";
          const containsMarkdown = /(?:^|\n)#{1,5}\s|\[[^\]]+\]\(https?:\/\/|\*\*[^*]+\*\*|(?:^|\n)\s*[-*+]\s/m.test(pastedText);
          if (containsMarkdown && instance.markdown?.parse) {
            event.preventDefault();
            instance.chain().focus().insertContent(instance.markdown.parse(pastedText)).run();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: current }) => onChangeRef.current?.(toStoredDocument(current.getJSON())),
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
    try { const asset = cacheMediaAsset(onAddMediaRef.current ? await onAddMediaRef.current(file) : { data: await readImage(file) }); const src = asset.data || (asset.id ? "memomedia://" + asset.id : ""); editor.chain().focus().setImage({ src, alt: asset.name || file.name.replace(/\.[^.]+$/, ""), width: 420 }).run(); }
    catch (error) { setDialog({ type: "notice", title: "Could not insert image", message: error.message }); }
  }
  function openInsert(type) {
    if (!editor) return;
    const selection = editor.state.selection;
    let linkRange = { from: selection.from, to: selection.to, text: editor.state.doc.textBetween(selection.from, selection.to, " ") };
    let activeLink = editor.getAttributes("link");
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.marks.some(mark => mark.type.name === "link")) return;
      const mark = node.marks.find(item => item.type.name === "link");
      if (selection.from >= pos && selection.from <= pos + node.nodeSize && (!selection.empty || selection.from < pos + node.nodeSize)) {
        activeLink = mark.attrs;
        linkRange = { from: pos, to: pos + node.nodeSize, text: node.text || "" };
      }
    });
    const selectedText = linkRange.text;
    const mathType = editor.isActive("inlineMath") ? "inlineMath" : editor.isActive("blockMath") ? "blockMath" : null;
    const editing = (type === "inlineMath" || type === "blockMath") && mathType === type;
    const node = editing ? editor.state.doc.nodeAt(selection.from) : null;
    setDialogValue(type === "link" ? String(activeLink.href || "") : editing ? String(node?.attrs?.latex || "") : "");
    setDialogText(type === "link" ? selectedText : "");
    setDialog({ type, from: type === "link" ? linkRange.from : selection.from, to: type === "link" ? linkRange.to : selection.to, editing, title: editing ? "Edit equation" : type === "inlineMath" ? "Insert inline equation" : type === "blockMath" ? "Insert display equation" : type === "link" ? (activeLink.href ? "Edit link" : "Insert link") : "Insert video link card", message: type.includes("Math") ? "Enter a LaTeX expression." : type === "link" ? "Set the visible text and destination." : "Add a compact card that opens the video in your browser." });
  }
  function submitInsert() {
    if (!editor || !dialogValue.trim()) { setDialog({ type: "notice", title: "Nothing to insert", message: "Enter a value first." }); return; }
    if (dialog.type === "inlineMath" || dialog.type === "blockMath") {
      const nodeType = dialog.type, latex = dialogValue.trim();
      if (dialog.editing) editor.chain().focus().setNodeSelection(dialog.from).updateAttributes(nodeType, { latex }).run();
      else editor.chain().focus().setTextSelection({ from: dialog.from, to: dialog.to })[nodeType === "inlineMath" ? "insertInlineMath" : "insertBlockMath"]({ latex }).run();
    }
    if (dialog.type === "link") {
      let url; try { url = new URL(dialogValue.trim()); } catch { setDialog({ type: "notice", title: "Invalid link", message: "Enter a complete https:// or http:// link." }); return; }
      if (!["http:", "https:"].includes(url.protocol)) { setDialog({ type: "notice", title: "Invalid link", message: "Only http and https links are supported." }); return; }
      editor.chain().focus().setTextSelection({ from: dialog.from, to: dialog.to }).insertContent({ type: "text", text: dialogText.trim() || url.hostname, marks: [{ type: "link", attrs: { href: url.href, target: "_blank", rel: "noopener noreferrer" } }] }).run();
    }
    if (dialog.type === "video") {
      const target = videoTarget(dialogValue);
      if (target.error) { setDialog({ type: "notice", title: "Unable to add video link", message: target.error }); return; }
      editor.chain().focus().setTextSelection({ from: dialog.from, to: dialog.to }).insertContent({ type: "cardVideo", attrs: target }).run();
    }
    setDialog(null); setDialogValue(""); setDialogText("");
  }

  const insertActions = [
    { label: "Paragraph", detail: "Normal text block", run: () => editor.chain().focus().setParagraph().run() },
    { label: "Heading 1", detail: "Large section heading", run: () => editor.chain().focus().setHeading({ level: 1 }).run() },
    { label: "Heading 2", detail: "Section heading", run: () => editor.chain().focus().setHeading({ level: 2 }).run() },
    { label: "Heading 3", detail: "Small heading", run: () => editor.chain().focus().setHeading({ level: 3 }).run() },
    { label: "Code block", detail: "Monospaced code", run: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: "Table", detail: "Insert a 2 × 2 table", run: () => editor.chain().focus().insertContent({ type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "paragraph" }] }, { type: "tableHeader", content: [{ type: "paragraph" }] }] }, { type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph" }] }, { type: "tableCell", content: [{ type: "paragraph" }] }] }] }).run() },
    { label: "Link", detail: "Add or edit a hyperlink", run: () => openInsert("link") },
    { label: "Image", detail: "Insert an image", run: () => fileRef.current?.click() },
    { label: "Inline equation", detail: "Insert LaTeX in a sentence", run: () => openInsert("inlineMath") },
    { label: "Block equation", detail: "Insert a display equation", run: () => openInsert("blockMath") },
    { label: "Video link", detail: "Add a video link card", run: () => openInsert("video") },
  ];
  function chooseInsert(action) {
    action.run();
    setInsertMenu(false);
    setInsertQuery("");
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
      {tools.filter(({ label: name }) => ["Bold", "Italic", "Underline", "Bullet list", "Numbered list", "Quote", "Inline code"].includes(name)).map(({ label: name, icon: Icon, run, active }) => <button type="button" class={`rich-editor-tool ${editor && active(editor) ? "is-active" : ""}`} title={name} aria-label={name} disabled={!editor} onMouseDown={e => e.preventDefault()} onClick={() => editor && run(editor)}><Icon size={15}/></button>)}
      <button type="button" class={`rich-editor-tool ${insertMenu ? "is-active" : ""}`} title="Insert block or element" aria-label="Insert block or element" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>setInsertMenu(value=>!value)}><Plus size={16}/></button>
      <span class="rich-editor-divider"/>
      {imageSelected && <><button type="button" class="rich-editor-tool" title="Decrease image size" aria-label="Decrease image size" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>resize(-60)}><Minus size={15}/></button><button type="button" class="rich-editor-tool" title="Increase image size" aria-label="Increase image size" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>resize(60)}><Plus size={15}/></button><span class="rich-editor-divider"/></>}
      <div class="rich-editor-colors" role="group" aria-label="Text colour">
        {["#e6e6e6", "#e06c75", "#e5a14b", "#9bc66b", "#72a7e8", "#b18be0"].map(color => <button type="button" class={`rich-editor-color-swatch ${editor?.getAttributes("textStyle").color === color ? "is-active" : ""}`} style={{ backgroundColor: color }} title={`Text colour ${color}`} aria-label={`Text colour ${color}`} disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().setColor(color).run()}/>)}
        <button type="button" class="rich-editor-color-reset" title="Remove text colour" aria-label="Remove text colour" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().unsetColor().run()}>A</button>
      </div>
      <button type="button" class="rich-editor-tool" title="Insert link" aria-label="Insert link" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>openInsert("link")}><LinkIcon size={15}/></button>
      <span class="rich-editor-divider"/>
      <button type="button" class="rich-editor-tool" title="Insert image" aria-label="Insert image" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>fileRef.current?.click()}><ImagePlus size={15}/></button>
      <span class="rich-editor-divider"/>
      <button type="button" class="rich-editor-tool" title="Inline equation" aria-label="Inline equation" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>openInsert("inlineMath")}><Sigma size={15}/></button>
      <button type="button" class="rich-editor-tool" title="Display equation" aria-label="Display equation" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>openInsert("blockMath")}>∑</button>
      <button type="button" class="rich-editor-tool" title="Insert video link card" aria-label="Insert video link card" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>openInsert("video")}><Video size={15}/></button>
      <span class="rich-editor-divider"/>
      <button type="button" class="rich-editor-tool" title="Undo" aria-label="Undo" disabled={!editor?.can().undo()} onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().undo().run()}><Undo2 size={15}/></button>
      <button type="button" class="rich-editor-tool" title="Redo" aria-label="Redo" disabled={!editor?.can().redo()} onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().redo().run()}><Redo2 size={15}/></button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={insertImage}/>
    </div>
    {insertMenu && <div class="rich-editor-insert-menu">
      <input autoFocus value={insertQuery} onInput={e=>setInsertQuery(e.currentTarget.value)} placeholder="Search blocks and actions..." aria-label="Search insert menu"/>
      <div class="rich-editor-insert-results">
        {insertActions.filter(item => (item.label + " " + item.detail).toLowerCase().includes(insertQuery.toLowerCase())).map(item => <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>chooseInsert(item)}><strong>{item.label}</strong><span>{item.detail}</span></button>)}
        {!insertActions.some(item => (item.label + " " + item.detail).toLowerCase().includes(insertQuery.toLowerCase())) && <p>No matching blocks</p>}
      </div>
    </div>}
    <div class="rich-editor-surface"><div ref={hostRef}/></div>
    {dialog && <div class="prompt-backdrop" onMouseDown={e=>e.target===e.currentTarget && setDialog(null)}>
      <section class="prompt-panel rich-editor-insert-dialog" role="dialog" aria-modal="true" aria-label={dialog.title}>
        <div class="prompt-heading"><h2>{dialog.title}</h2><button type="button" aria-label="Close" onClick={()=>setDialog(null)}><X size={16}/></button></div>
        <p>{dialog.message}</p>
        {dialog.type === "link" && <input aria-label="Link text" placeholder="Link text" value={dialogText} onInput={e=>setDialogText(e.currentTarget.value)}/>}
        {dialog.type !== "notice" && <textarea rows={dialog.type==="blockMath" ? 5 : 3} value={dialogValue} onInput={e=>setDialogValue(e.currentTarget.value)} placeholder={dialog.type.includes("Math") ? "\\frac{a+b}{c}" : dialog.type === "link" ? "https://example.com" : "Paste the link"}/>}
        <div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={()=>setDialog(null)}>{dialog.type==="notice" ? "Close" : "Cancel"}</button>{dialog.type!=="notice" && <button type="button" class="prompt-confirm" onClick={submitInsert}>Insert</button>}</div>
      </section>
    </div>}
  </section>;
}
