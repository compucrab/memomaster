import { Editor, generateHTML } from "@tiptap/core";
import { createCardExtensions } from "./editorExtensions.js";
import { renderMarkdown, unescapeMarkdownPunctuation } from "./markdown.js";

const extensions = createCardExtensions();

export function isCardDocument(value) {
  return !!value && typeof value === "object" && value.type === "doc" && Array.isArray(value.content);
}

export function normalizeCardDocument(value = "") {
  if (isCardDocument(value)) return value;
  if (value && typeof value === "object") return { type: "doc", content: [] };
  const source = unescapeMarkdownPunctuation(String(value || ""));
  if (!source.trim()) return { type: "doc", content: [{ type: "paragraph" }] };
  if (typeof document === "undefined") return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: source }] }] };
  const editor = new Editor({
    element: document.createElement("div"),
    extensions,
    content: source,
    contentType: "markdown",
    editable: false,
  });
  const json = editor.getJSON();
  editor.destroy();
  return json;
}

function resolveMedia(node, mediaById) {
  if (!node || typeof node !== "object") return node;
  const next = { ...node };
  if (next.attrs?.src?.startsWith?.("memomedia://")) {
    const id = next.attrs.src.slice("memomedia://".length);
    const asset = mediaById.get(id);
    if (asset?.data) next.attrs = { ...next.attrs, src: asset.data };
  }
  if (Array.isArray(next.content)) next.content = next.content.map(child => resolveMedia(child, mediaById));
  return next;
}

export function renderCardDocument(value = "", media = []) {
  if (!isCardDocument(value)) return renderMarkdown(String(value || ""), media);
  const mediaById = new Map(media.filter(asset => asset?.id).map(asset => [asset.id, asset]));
  const document = resolveMedia(value, mediaById);
  return generateHTML(document, extensions);
}

export function cardDocumentText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) return value.map(cardDocumentText).join(" ");
  return [value.text || "", ...(value.content || []).map(cardDocumentText)].join(" ");
}
