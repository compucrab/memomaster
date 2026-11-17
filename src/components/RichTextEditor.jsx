import { useEffect, useRef, useState } from "preact/hooks";
import { Editor } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Image as ImageIcon, Sigma, Video, X, Pilcrow, Heading1, Heading2, Heading3, Heading4, Heading5, List, ListOrdered, Quote, Code, CodeXml, Table, Palette, Undo2, Redo2, Info } from "lucide-preact";
import { createCardExtensions } from "../services/editorExtensions";
import { normalizeCardDocument } from "../services/cardDocument";
import "katex/dist/katex.min.css";


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
  if (host === "vimeo.com" || host.endsWith(".vimeo.com")) return /^\d+$/.test(url.pathname.split("/").filter(Boolean).pop() || "") ? { url: value.trim(), provider: "vimeo" } : { error: "This Vimeo link does not contain a valid video ID." };
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return /^\/(reel|p|tv)\/[\w-]+/i.test(url.pathname) ? { url: value.trim(), provider: "instagram" } : { error: "This Instagram link is not a supported post or reel." };
  if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch") return { url: value.trim(), provider: "facebook" };
  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return { url: value.trim(), provider: "direct" };
  return { error: "Unsupported video host. Try YouTube, Instagram, Facebook, Vimeo, or a direct MP4/WebM/OGG link." };
}

export default function RichTextEditor({ label, value = "", placeholder, onChange, media = [], onAddMedia }) {
  const hostRef = useRef(null), fileRef = useRef(null), paletteInputRef = useRef(null), dialogFieldRef = useRef(null), editorRef = useRef(null);
  const onChangeRef = useRef(onChange), onAddMediaRef = useRef(onAddMedia), mediaRef = useRef(media);
  mediaRef.current = media;
  const [editor, setEditor] = useState(null), [revision, setRevision] = useState(0);
  const [dialog, setDialog] = useState(null), [dialogValue, setDialogValue] = useState(""), [dialogText, setDialogText] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false), [paletteQuery, setPaletteQuery] = useState("");
  const [hoverEdit, setHoverEdit] = useState(null);
  const [infoTitle, setInfoTitle] = useState("");
  const colorInputRef = useRef(null);
  const [palettePosition, setPalettePosition] = useState({ left: 24, top: 24 }), [selectionPosition, setSelectionPosition] = useState(null);
  onChangeRef.current = onChange;
  onAddMediaRef.current = onAddMedia;

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

  function positionAt(pos) {
    const instance = editorRef.current;
    if (!instance) return;
    try {
      const rect = instance.view.coordsAtPos(Math.max(0, Math.min(pos, instance.state.doc.content.size)));
      setPalettePosition({ left: Math.max(12, Math.min(window.innerWidth - 340, rect.left)), top: Math.max(12, Math.min(window.innerHeight - 360, rect.bottom + 8)) });
    } catch { setPalettePosition({ left: 24, top: 24 }); }
  }
  function openPalette() {
    const instance = editorRef.current;
    if (!instance) return;
    positionAt(instance.state.selection.from);
    setPaletteQuery("");
    setPaletteOpen(true);
  }
  function updateSelectionPosition(instance) {
    const selection = instance.state.selection;
    if (selection.empty || selection.node) { setSelectionPosition(null); return; }
    try {
      const start = instance.view.coordsAtPos(selection.from), end = instance.view.coordsAtPos(selection.to);
      setSelectionPosition({ left: Math.max(8, Math.min(window.innerWidth - 330, (start.left + end.left) / 2)), top: Math.max(8, start.top - 48) });
    } catch { setSelectionPosition(null); }
  }
  function openInsert(type, nodePosition = null) {
    const instance = editorRef.current;
    if (!instance) return;
    if (nodePosition !== null) { if (type === "link") instance.commands.setTextSelection({ from: nodePosition, to: nodePosition + 1 }); else instance.commands.setNodeSelection(nodePosition); }
    const selection = instance.state.selection;
    let linkRange = { from: selection.from, to: selection.to, text: instance.state.doc.textBetween(selection.from, selection.to, " ") };
    let activeLink = instance.getAttributes("link");
    instance.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.marks.some(mark => mark.type.name === "link")) return;
      const mark = node.marks.find(item => item.type.name === "link");
      if (selection.from >= pos && selection.from <= pos + node.nodeSize && (!selection.empty || selection.from < pos + node.nodeSize)) {
        activeLink = mark.attrs;
        linkRange = { from: pos, to: pos + node.nodeSize, text: node.text || "" };
      }
    });
    const selectedNode = selection.node || instance.state.doc.nodeAt(selection.from) || selection.$from.nodeAfter;
    const editingMath = (type === "inlineMath" || type === "blockMath") && selectedNode?.type?.name === type;
    const editingVideo = type === "video" && selectedNode?.type?.name === "cardVideo";
    const editingInfo = type === "info" && selectedNode?.type?.name === "cardInfo";
    const from = type === "link" ? linkRange.from : selection.from;
    setDialogValue(type === "link" ? String(activeLink.href || "") : editingMath ? String(selectedNode.attrs.latex || "") : editingVideo ? String(selectedNode.attrs.url || "") : "");
    setDialogText(type === "link" ? linkRange.text : editingVideo ? String(selectedNode.attrs.label || "") : "");
    if (editingInfo) setInfoTitle(String(selectedNode.attrs.title || "Additional information"));
    setDialog({
      type, from, to: type === "link" ? linkRange.to : selection.to, editing: editingMath, editingVideo, editingInfo,
      title: editingMath ? "Edit equation" : type === "inlineMath" ? "Insert inline equation" : type === "blockMath" ? "Insert display equation" : type === "link" ? (activeLink.href ? "Edit link" : "Insert link") : editingVideo ? "Edit video card" : editingInfo ? "Edit info card" : "Insert video card",
      message: type.includes("Math") ? "Edit the raw LaTeX source below." : type === "link" ? "Set the visible text and destination." : type === "info" ? "Change the title shown at the top of this card." : "Choose the card label and video destination.",
    });
    setPaletteOpen(false);
    setSelectionPosition(null);
  }

  useEffect(() => {
    const insertFiles = async (files, instance) => {
      const images = Array.from(files || []).filter(file => file.type?.startsWith("image/"));
      if (!images.length) return false;
      for (const file of images) {
        if (file.size > 12 * 1024 * 1024) { setDialog({ type: "notice", title: "Image is too large", message: "The selected image exceeds the 12 MB limit." }); continue; }
        try {
          const asset = cacheMediaAsset(onAddMediaRef.current ? await onAddMediaRef.current(file) : { data: await readImage(file) });
          instance.chain().focus().setImage({ src: asset.data || (asset.id ? "memomedia://" + asset.id : ""), alt: asset.name || file.name.replace(/\.[^.]+$/, ""), width: 420 }).run();
        } catch (error) { setDialog({ type: "notice", title: "Could not paste image", message: error.message }); }
      }
      return true;
    };
    const instance = new Editor({
      element: hostRef.current,
      extensions: [...createCardExtensions(), Placeholder.configure({ placeholder: placeholder || "" })],
      content: toEditorDocument(value), contentType: "json",
      editorProps: {
        attributes: { class: "rich-editor-content", role: "textbox", "aria-label": label, "aria-multiline": "true", "data-placeholder": placeholder || "", spellcheck: "true" },
        handleKeyDown(view, event) {
          if (event.ctrlKey && (event.code === "Space" || event.key === " ")) { event.preventDefault(); openPalette(); return true; }
          if (event.key === "Escape") { setPaletteOpen(false); return true; }
          return false;
        },
        handleDOMEvents: {
          contextmenu(view, event) {
            const target = event.target?.closest?.(".tiptap-mathematics-render, [data-card-video], [data-card-info], table, img, a");
            if (!target) return false;
            event.preventDefault();
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (!coords) return true;
            let found = null;
            view.state.doc.nodesBetween(Math.max(0, coords.pos - 1), Math.min(view.state.doc.content.size, coords.pos + 2), (node, pos) => {
              if (["inlineMath", "blockMath", "cardVideo", "cardInfo", "table", "image"].includes(node.type.name)) found = { type: node.type.name, pos };
            });
            if (found) { if (found.type === "cardVideo") openInsert("video", found.pos); else if (found.type === "cardInfo") openInsert("info", found.pos); else if (["inlineMath","blockMath"].includes(found.type)) openInsert(found.type, found.pos); else setHoverEdit({ type: found.type, pos: found.pos, x: event.clientX, y: event.clientY }); }
            else if (target.tagName === "A") { const anchorPos = view.posAtDOM(target, 0); instance.commands.setTextSelection({ from: anchorPos, to: Math.min(view.state.doc.content.size, anchorPos + 1) }); openInsert("link", anchorPos); }
            return true;
          },
        },
        handlePaste(view, event) {
          const files = Array.from(event.clipboardData?.items || []).filter(item => item.kind === "file").map(item => item.getAsFile()).filter(Boolean);
          if (files.length) { insertFiles(files, instance).catch(() => {}); return true; }
          const pastedText = event.clipboardData?.getData("text/plain") || "";
          const containsMarkdown = /(?:^|\n)#{1,5}\s|\[[^\]]+\]\(https?:\/\/|\*\*[^*]+\*\*|(?:^|\n)\s*[-*+]\s/m.test(pastedText);
          if (containsMarkdown && instance.markdown?.parse) { event.preventDefault(); instance.chain().focus().insertContent(instance.markdown.parse(pastedText)).run(); return true; }
          return false;
        },
      },
      onUpdate: ({ editor: current }) => onChangeRef.current?.(toStoredDocument(current.getJSON())),
      onSelectionUpdate: ({ editor: current }) => updateSelectionPosition(current),
      onTransaction: ({ editor: current }) => { setRevision(n => n + 1); updateSelectionPosition(current); },
    });
    editorRef.current = instance;
    setEditor(instance);
    return () => { instance.destroy(); editorRef.current = null; setEditor(null); };
  }, []);

  useEffect(() => { if (paletteOpen) paletteInputRef.current?.focus(); }, [paletteOpen]);

  useEffect(() => {
    if (!dialog || dialog.type === "notice") return;
    dialogFieldRef.current?.focus();
    dialogFieldRef.current?.select?.();
  }, [dialog]);

  useEffect(() => {
    if (!paletteOpen) return;
    const closeOnEscape = event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setPaletteOpen(false); }
    };
    window.addEventListener("keydown", closeOnEscape, true);
    return () => window.removeEventListener("keydown", closeOnEscape, true);
  }, [paletteOpen]);

  async function insertImage(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !editor) return;
    if (!file.type.startsWith("image/")) { setDialog({ type: "notice", title: "Unsupported file", message: "Choose an image file such as PNG, JPEG, GIF or WebP." }); return; }
    if (file.size > 12 * 1024 * 1024) { setDialog({ type: "notice", title: "Image is too large", message: "Choose an image smaller than 12 MB." }); return; }
    try {
      const asset = cacheMediaAsset(onAddMediaRef.current ? await onAddMediaRef.current(file) : { data: await readImage(file) });
      editor.chain().focus().setImage({ src: asset.data || (asset.id ? "memomedia://" + asset.id : ""), alt: asset.name || file.name.replace(/\.[^.]+$/, ""), width: 420 }).run();
    } catch (error) { setDialog({ type: "notice", title: "Could not insert image", message: error.message }); }
  }

  function submitInsert() {
    if (!editor || (dialog.type !== "info" && !dialogValue.trim())) { setDialog({ type: "notice", title: "Nothing to insert", message: "Enter a value first." }); return; }
    if (dialog.type === "inlineMath" || dialog.type === "blockMath") {
      const nodeType = dialog.type, latex = dialogValue.trim();
      if (dialog.editing) editor.chain().focus().setNodeSelection(dialog.from).updateAttributes(nodeType, { latex }).run();
      else editor.chain().focus().setTextSelection({ from: dialog.from, to: dialog.to })[nodeType === "inlineMath" ? "insertInlineMath" : "insertBlockMath"]({ latex }).run();
    } else if (dialog.type === "link") {
      let url;
      try { url = new URL(dialogValue.trim()); } catch { setDialog({ type: "notice", title: "Invalid link", message: "Enter a complete https:// or http:// link." }); return; }
      if (!["http:", "https:"].includes(url.protocol)) { setDialog({ type: "notice", title: "Invalid link", message: "Only http and https links are supported." }); return; }
      editor.chain().focus().setTextSelection({ from: dialog.from, to: dialog.to }).insertContent({ type: "text", text: dialogText.trim() || url.hostname, marks: [{ type: "link", attrs: { href: url.href, target: "_blank", rel: "noopener noreferrer" } }] }).run();
    } else if (dialog.type === "info") {
      editor.chain().focus().setNodeSelection(dialog.from).updateAttributes("cardInfo", { title: infoTitle.trim() || "Additional information" }).run();
    } else if (dialog.type === "video") {
      const target = videoTarget(dialogValue);
      if (target.error) { setDialog({ type: "notice", title: "Unable to add video link", message: target.error }); return; }
      const attrs = { ...target, label: dialogText.trim() || "Video link" };
      if (dialog.editingVideo) editor.chain().focus().setNodeSelection(dialog.from).updateAttributes("cardVideo", attrs).run();
      else editor.chain().focus().setTextSelection({ from: dialog.from, to: dialog.to }).insertContent({ type: "cardVideo", attrs }).run();
    }
    setDialog(null); setDialogValue(""); setDialogText("");
  }

  const actions = [
    { label: "Paragraph", icon: Pilcrow, detail: "Convert the current block to normal text", run: () => editor.chain().focus().setParagraph().run() },
    ...[1, 2, 3, 4, 5].map(level => ({ label: "Heading " + level, icon: [Heading1, Heading2, Heading3, Heading4, Heading5][level - 1], detail: "Format the current block as heading " + level, run: () => editor.chain().focus().setHeading({ level }).run() })),
    { label: "Bold", icon: Bold, detail: "Bold selected text", run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, detail: "Italic selected text", run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline", icon: UnderlineIcon, detail: "Underline selected text", run: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Bullet list", icon: List, detail: "Create a bullet list", run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, detail: "Create a numbered list", run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", icon: Quote, detail: "Turn the current block into a quote", run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Inline code", icon: CodeXml, detail: "Format selected text as inline code", run: () => editor.chain().focus().toggleCode().run() },
    { label: "Code block", icon: Code, detail: "Insert an editable raw code block", run: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: "Link", icon: LinkIcon, detail: "Add or edit a hyperlink", run: () => openInsert("link") },
    { label: "Image", icon: ImageIcon, detail: "Insert an image", run: () => fileRef.current?.click() },
    { label: "Inline equation", icon: Sigma, detail: "Insert or edit raw LaTeX inline", run: () => openInsert("inlineMath") },
    { label: "Block equation", icon: Sigma, detail: "Insert or edit raw LaTeX display math", run: () => openInsert("blockMath") },
    { label: "Video card", icon: Video, detail: "Insert or edit a video link card", run: () => openInsert("video") },
    { label: "Info card", icon: Info, detail: "Insert a card for notes and additional information", run: () => editor.chain().focus().insertContent({ type: "cardInfo", attrs: { title: "Additional information" }, content: [{ type: "paragraph" }] }).run() },
    { label: "Text color", icon: Palette, detail: "Choose any text color", run: () => colorInputRef.current?.click() },
    { label: "Table", icon: Table, detail: "Insert a 2 × 2 table", run: () => editor.chain().focus().insertContent({ type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "paragraph" }] }, { type: "tableHeader", content: [{ type: "paragraph" }] }] }, { type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph" }] }, { type: "tableCell", content: [{ type: "paragraph" }] }] }] }).run() },

    { label: "Undo", icon: Undo2, detail: "Undo the last edit", run: () => editor.chain().focus().undo().run() },
    { label: "Redo", icon: Redo2, detail: "Redo the last undone edit", run: () => editor.chain().focus().redo().run() },
  ];
  const filteredActions = actions.filter(item => (item.label + " " + item.detail).toLowerCase().includes(paletteQuery.toLowerCase()));
  function chooseAction(action) { action.run(); setPaletteOpen(false); setPaletteQuery(""); }
  function applySelectionFormat(callback) { if (editor) callback(editor.chain().focus()); setSelectionPosition(null); }
  const selection = editor?.state.selection;
  const hasTextSelection = !!selection && !selection.empty && !selection.node && !!editor.state.doc.textBetween(selection.from, selection.to).trim();

  return <section class="rich-editor">
    <div class="rich-editor-heading">{label} <span class="rich-editor-shortcut">Ctrl + Space for commands</span></div>
    <div class="rich-editor-surface" onMouseOver={event => { const target = event.target.closest("a, img, table, .tiptap-mathematics-render, [data-card-info], [data-card-video]"); if (!target) return; const view = editorRef.current?.view; if (!view) return; try { const pos = view.posAtDOM(target, 0); const $pos = view.state.doc.resolve(pos); let found = null; for (let depth = $pos.depth; depth > 0; depth--) { const node = $pos.node(depth); if (["cardInfo","cardVideo","table","image","inlineMath","blockMath"].includes(node.type.name)) { found = { type: node.type.name, pos: $pos.before(depth), x: event.clientX, y: event.clientY }; break; } } if (target.tagName === "A" && !found) { const link = view.state.doc.rangeHasMark(Math.max(0,pos), Math.min(view.state.doc.content.size,pos+1), view.state.schema.marks.link); if (link) found = { type: "link", pos, x: event.clientX, y: event.clientY }; } if (found) setHoverEdit(found); } catch {} }}><div ref={hostRef}/></div>
    {hoverEdit && <div class="rich-editor-hover-tools" style={{ left: Math.max(8, Math.min(window.innerWidth - 210, hoverEdit.x)) + "px", top: Math.max(8, hoverEdit.y - 42) + "px" }} onMouseLeave={() => setHoverEdit(null)} onMouseDown={event => event.preventDefault()}>
      <strong>{hoverEdit.type === "cardInfo" ? "Info card" : hoverEdit.type === "cardVideo" ? "Video card" : hoverEdit.type === "table" ? "Table" : hoverEdit.type === "image" ? "Image" : ["inlineMath","blockMath"].includes(hoverEdit.type) ? "Equation" : "Link"}</strong>
      {hoverEdit.type === "cardInfo" && <button type="button" onClick={() => openInsert("info", hoverEdit.pos)}>Edit title</button>}
      {hoverEdit.type === "cardVideo" && <button type="button" onClick={() => openInsert("video", hoverEdit.pos)}>Edit</button>}
      {["inlineMath","blockMath"].includes(hoverEdit.type) && <button type="button" onClick={() => openInsert(hoverEdit.type, hoverEdit.pos)}>Edit equation</button>}
      {hoverEdit.type === "link" && <button type="button" onClick={() => openInsert("link")}>Edit link</button>}
      {hoverEdit.type === "image" && <button type="button" onClick={() => { editor?.commands.setNodeSelection(hoverEdit.pos); setHoverEdit(null); }}>Select image</button>}
      {hoverEdit.type === "table" && <>
        <button type="button" onClick={() => editor?.chain().focus().setTextSelection(hoverEdit.pos + 4).addTableRowAfter().run()}>+ Row</button>
        <button type="button" onClick={() => editor?.chain().focus().setTextSelection(hoverEdit.pos + 4).addTableColumnAfter().run()}>+ Column</button>
        <button type="button" onClick={() => editor?.chain().focus().setTextSelection(hoverEdit.pos + 4).deleteTableRow().run()}>− Row</button>
        <button type="button" onClick={() => editor?.chain().focus().setTextSelection(hoverEdit.pos + 4).deleteTableColumn().run()}>− Column</button>
      </>}
    </div>}
    {hasTextSelection && selectionPosition && !paletteOpen && !dialog && <div class="rich-editor-selection-tools" style={{ left: selectionPosition.left + "px", top: selectionPosition.top + "px" }} onMouseDown={event => { if (event.target.closest("button")) event.preventDefault(); }}>
      <button type="button" title="Bold" aria-label="Bold" class={editor.isActive("bold") ? "is-active" : ""} onClick={() => applySelectionFormat(chain => chain.toggleBold().run())}><Bold size={14}/></button>
      <button type="button" title="Italic" aria-label="Italic" class={editor.isActive("italic") ? "is-active" : ""} onClick={() => applySelectionFormat(chain => chain.toggleItalic().run())}><Italic size={14}/></button>
      <button type="button" title="Underline" aria-label="Underline" class={editor.isActive("underline") ? "is-active" : ""} onClick={() => applySelectionFormat(chain => chain.toggleUnderline().run())}><UnderlineIcon size={14}/></button>
      <button type="button" title="Inline code" aria-label="Inline code" class={editor.isActive("code") ? "is-active" : ""} onClick={() => applySelectionFormat(chain => chain.toggleCode().run())}><CodeXml size={14}/></button>
      <span class="rich-editor-selection-divider"/>
      <select aria-label="Text block style" value={editor.isActive("heading") ? String(editor.getAttributes("heading").level) : "p"} onChange={event => {
        const value = event.currentTarget.value;
        applySelectionFormat(chain => (value === "p" ? chain.setParagraph() : chain.setHeading({ level: Number(value) })).run());
      }}>
        <option value="p">Paragraph</option>
        {[1, 2, 3, 4, 5].map(level => <option value={String(level)}>Heading {level}</option>)}
      </select>
      <span class="rich-editor-selection-divider"/>
      <label class="rich-editor-color-picker" title="Text color"><input type="color" aria-label="Choose text color" value={editor.getAttributes("textStyle").color || "#5797f5"} onInput={event => applySelectionFormat(chain => chain.setColor(event.currentTarget.value).run())}/><span>Text color</span></label>
      <button type="button" class="rich-editor-selection-reset" title="Default theme color" aria-label="Default theme color" onClick={() => applySelectionFormat(chain => chain.unsetColor().run())}>A</button>
      <span class="rich-editor-selection-divider"/>
      <button type="button" title="Add link" aria-label="Add link" onClick={() => openInsert("link")}><LinkIcon size={14}/></button>
    </div>}
    {paletteOpen && <div class="rich-editor-command-palette" style={{ left: palettePosition.left + "px", top: palettePosition.top + "px" }} onMouseDown={event => event.stopPropagation()}>
      <div class="rich-editor-command-search"><span>⌘</span><input ref={paletteInputRef} value={paletteQuery} onInput={event => setPaletteQuery(event.currentTarget.value)} onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); setPaletteOpen(false); }
        if (event.key === "Enter" && filteredActions[0]) { event.preventDefault(); chooseAction(filteredActions[0]); }
        if (event.key === "ArrowDown") { event.preventDefault(); event.currentTarget.parentElement?.nextElementSibling?.querySelector("button")?.focus(); }
      }} placeholder="Search commands..." aria-label="Search editor commands"/></div>
      <div class="rich-editor-command-results">
        {filteredActions.map(action => <button type="button" key={action.label} onMouseDown={event => event.preventDefault()} onClick={() => chooseAction(action)}><span class="rich-editor-command-icon">{action.color ? <i class="rich-editor-command-color" style={{ backgroundColor: action.color }}/> : action.icon && <action.icon size={15}/>}</span><span class="rich-editor-command-copy"><strong>{action.label}</strong><small>{action.detail}</small></span></button>)}
        {!filteredActions.length && <p>No matching commands</p>}
      </div>
      <div class="rich-editor-command-hint">↑↓ to navigate · Enter to select · Esc to close</div>
    </div>}
    <input ref={fileRef} type="file" accept="image/*" hidden onChange={insertImage}/>
    <input ref={colorInputRef} type="color" aria-label="Choose text color" tabIndex={-1} style={{ position: "fixed", left: "-1000px", top: "0", width: "1px", height: "1px", opacity: 0 }} onInput={event => editor?.chain().focus().setColor(event.currentTarget.value).run()}/>
    {dialog && <div class="prompt-backdrop" onMouseDown={event => event.target === event.currentTarget && setDialog(null)}>
      <section class="prompt-panel rich-editor-insert-dialog" role="dialog" aria-modal="true" aria-label={dialog.title}>
        <div class="prompt-heading"><h2>{dialog.title}</h2><button type="button" aria-label="Close" onClick={() => setDialog(null)}><X size={16}/></button></div>
        <p>{dialog.message}</p>
        {dialog.type === "info" && <input ref={dialogFieldRef} aria-label="Info card title" placeholder="Additional information" value={infoTitle} onInput={event => setInfoTitle(event.currentTarget.value)}/>}
        {(dialog.type === "link" || dialog.type === "video") && <input aria-label={dialog.type === "link" ? "Link text" : "Video card text"} placeholder={dialog.type === "link" ? "Link text" : "Text shown on the video card"} value={dialogText} onInput={event => setDialogText(event.currentTarget.value)}/>}
        {dialog.type !== "notice" && dialog.type !== "info" && <textarea ref={dialogFieldRef} rows={dialog.type === "blockMath" ? 5 : 3} value={dialogValue} onInput={event => setDialogValue(event.currentTarget.value)} placeholder={dialog.type.includes("Math") ? "\\frac{a+b}{c}" : "https://example.com"}/>}
        <div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={() => setDialog(null)}>{dialog.type === "notice" ? "Close" : "Cancel"}</button>{dialog.type !== "notice" && <button type="button" class="prompt-confirm" onClick={submitInsert}>{dialog.editing || dialog.editingVideo || dialog.editingInfo ? "Save changes" : "Insert"}</button>}</div>
      </section>
    </div>}
    <span class="sr-only" aria-live="polite">{revision ? "Editor updated" : ""}</span>
  </section>;
}
