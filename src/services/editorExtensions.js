import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Underline from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import { Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import { Mathematics } from "@tiptap/extension-mathematics";
const safeMediaUrl = (value = "") => /^(https?:|memomedia:\/\/[\w-]+$|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(value) ? value : "";
export const CardImage = Image.extend({
  inline: false,
  addAttributes() { return { ...this.parent?.(), src: { default: null }, alt: { default: null }, title: { default: null }, width: { default: 420 } }; },
  addNodeView() {
    return ({ node, getPos, editor, HTMLAttributes, updateAttributes }) => {
      const dom = document.createElement("span");
      dom.className = "study-image-frame";
      dom.contentEditable = "false";
      const img = document.createElement("img");
      const handle = document.createElement("span");
      handle.className = "study-image-resize-handle";
      handle.setAttribute("role", "slider");
      handle.setAttribute("aria-label", "Resize image");
      dom.append(img, handle);
      const sync = current => {
        img.src = current.attrs.src || "";
        img.alt = current.attrs.alt || "";
        img.style.width = Math.max(40, Math.min(1600, Number(current.attrs.width) || 420)) + "px";
        img.style.maxWidth = "100%";
      };
      sync(node);
      let startX = 0, startWidth = 0;
      const move = event => updateAttributes({ width: Math.max(40, Math.min(1600, startWidth + event.clientX - startX)) });
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      handle.addEventListener("pointerdown", event => {
        event.preventDefault(); event.stopPropagation();
        startX = event.clientX; startWidth = img.getBoundingClientRect().width;
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up, { once: true });
      });
      return { dom, update(updated) { if (updated.type !== node.type) return false; node = updated; sync(updated); return true; }, destroy: up };
    };
  },
  renderHTML({ HTMLAttributes }) {
    const width = Math.max(40, Math.min(1600, Number(HTMLAttributes.width) || 420));
    const style = `width:${width}px;max-width:100%;display:block;margin:12px 0;`;
    return ["img", { ...this.options.HTMLAttributes, ...HTMLAttributes, style, "data-image-width": width }];
  },
  parseMarkdown(token) {
    const metadata = String(token.title || "").match(/width=(\d+)/);
    return { type: "image", attrs: { src: safeMediaUrl(token.href), alt: token.text || "", title: null, width: metadata ? Number(metadata[1]) : 420 } };
  },
  renderMarkdown(node) {
    const attrs = node?.attrs || {};
    const src = safeMediaUrl(attrs.src);
    if (!src) return "";
    const alt = String(attrs.alt || "").replace(/[\\\]]/g, "\\$&");
    const width = Math.max(40, Math.min(1600, Number(attrs.width) || 420));
    return "![" + alt + "](" + src + ' "width=' + width + '")';
  },
});
export const AlignedParagraph = Paragraph;
export const AlignedHeading = Heading.configure({ levels: [1, 2, 3, 4, 5] });
export const CardInfo = Node.create({
  name: "cardInfo",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  addAttributes() { return { title: { default: "Additional information" } }; },
  parseHTML() {
    return [{
      tag: "aside[data-card-info]",
      getAttrs: element => ({ title: element.getAttribute("data-title") || element.querySelector(":scope > header strong")?.textContent || "Additional information" }),
    }];
  },
  renderHTML({ HTMLAttributes }) {
    const title = String(HTMLAttributes.title || "Additional information").slice(0, 80);
    return ["aside", { class: "study-info-card", "data-card-info": "", "data-title": title },
      ["header", { class: "study-info-card-heading", contenteditable: "false" }, ["span", {}, "ⓘ"], ["strong", {}, title]],
      ["div", { class: "study-info-card-content" }, 0],
    ];
  },
});
export const CardVideo = Node.create({
  name: "cardVideo", group: "block", atom: true, selectable: true,
  addAttributes() { return { url: { default: "" }, provider: { default: "video" }, label: { default: "Video link" } }; },
  parseHTML() { return [{ tag: "a[data-card-video]", getAttrs: element => ({ url: element.getAttribute("href") || element.getAttribute("data-url") || "", provider: element.getAttribute("data-provider") || "video", label: element.getAttribute("data-label") || element.querySelector("strong")?.textContent || "Video link" }) }, { tag: "div[data-card-video]", getAttrs: element => ({ url: element.getAttribute("data-url") || "", provider: element.getAttribute("data-provider") || "video", label: element.getAttribute("data-label") || "Video link" }) }]; },
  renderHTML({ HTMLAttributes }) { const url = safeMediaUrl(HTMLAttributes.url); const label = String(HTMLAttributes.label || "Video link").slice(0, 80); return url ? ["a", { href: url, target: "_blank", rel: "noopener noreferrer", class: "study-video-card", "data-card-video": "", "data-url": url, "data-provider": HTMLAttributes.provider || "video", "data-label": label }, ["span", { class: "study-video-card-icon" }, "▶"], ["span", {}, ["strong", {}, label], ["small", {}, "Open video in browser"]], ["span", { class: "study-video-card-arrow" }, "↗"]] : ["div", { "data-card-video": "" }, "Unsupported video link"]; },
  markdownTokenizer: {
    name: "cardVideo", level: "block", start: source => source.indexOf("@[video"),
    tokenize(source) { const match = /^@\[video(?::([^\]]+))?\]\((https?:\/\/[^\s)]+)\)/.exec(source); return match ? { type: "cardVideo", raw: match[0], label: match[1] || "Video link", href: match[2] } : undefined; },
  },
  parseMarkdown: (token) => ({ type: "cardVideo", attrs: { url: token.href || "", provider: "video", label: token.label || "Video link" } }),
  renderMarkdown: (node) => { const url = safeMediaUrl(node?.attrs?.url); const label = String(node?.attrs?.label || "Video link").replace(/[\\]]/g, ""); return url ? `@[video:${label}](${url})` : ""; },
});
export const CardLink = Link.extend({
  markdownTokenizer: {
    name: "link",
    level: "inline",
    start: source => source.indexOf("["),
    tokenize(source) {
      const match = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/.exec(source);
      return match ? { type: "link", raw: match[0], text: match[1], href: match[2] } : undefined;
    },
  },
  parseMarkdown(token) {
    return { type: "text", text: token.text || "", marks: [{ type: "link", attrs: { href: token.href, target: null, rel: null, class: null } }] };
  },
  renderMarkdown(mark, helpers) {
    const href = String(mark?.attrs?.href || "");
    if (!/^https?:\/\//i.test(href)) return helpers.renderChildren(mark);
    return "[" + helpers.renderChildren(mark) + "](" + href + ")";
  },
});
export const CardMath = Mathematics.configure({ katexOptions: { throwOnError: false, strict: "ignore" } });

export const CardTextStyle = TextStyle.extend({
  renderMarkdown(mark, helpers) {
    const color = String(mark?.attrs?.color || "");
    const content = helpers.renderChildren(mark);
    return /^(#[0-9a-f]{3,8}|rgba?\([\d.% ,]+\)|hsla?\([\d.% ,]+\)|[a-z]{3,20})$/i.test(color)
      ? '<span style="color:' + color + '">' + content + "</span>"
      : content;
  },
});

export const CardTable = Node.create({
  name: "table",
  group: "block",
  content: "tableRow+",
  isolating: true,
  addCommands() {
    const findTable = (state) => {
      const $from = state.selection.$from;
      for (let depth = $from.depth; depth > 0; depth--) {
        if ($from.node(depth).type.name === "table") return { node: $from.node(depth), pos: $from.before(depth), depth };
      }
      return null;
    };
    return {
      addTableRowAfter: () => ({ state, dispatch }) => {
        const found = findTable(state); if (!found) return false;
        const $from = state.selection.$from;
        let rowDepth = $from.depth;
        while (rowDepth > found.depth && $from.node(rowDepth).type.name !== "tableRow") rowDepth--;
        if (rowDepth <= found.depth) return false;
        const row = $from.node(rowDepth);
        const cells = row.content.content.map(cell => cell.type.createAndFill());
        const nextRow = row.type.create(null, cells);
        if (dispatch) dispatch(state.tr.insert($from.after(rowDepth), nextRow));
        return true;
      },
      addTableColumnAfter: () => ({ state, dispatch }) => {
        const found = findTable(state); if (!found) return false;
        const tr = state.tr; const rows = [];
        found.node.forEach((row, rowOffset) => rows.push({ row, pos: found.pos + 1 + rowOffset }));
        const $from = state.selection.$from;
        let cellDepth = $from.depth;
        while (cellDepth > found.depth && !["tableCell", "tableHeader"].includes($from.node(cellDepth).type.name)) cellDepth--;
        const selectedIndex = cellDepth > found.depth ? $from.index(cellDepth - 1) : 0;
        rows.reverse().forEach(({ row, pos }) => {
          const index = Math.min(selectedIndex + 1, row.childCount);
          const template = row.child(Math.max(0, Math.min(index - 1, row.childCount - 1)));
          const cell = template.type.createAndFill();
          if (cell) tr.insert(pos + 1 + row.content.content.slice(0, index).reduce((sum, item) => sum + item.nodeSize, 0), cell);
        });
        if (dispatch) dispatch(tr);
        return true;
      },
      deleteTableRow: () => ({ state, dispatch }) => {
        const $from = state.selection.$from; let depth = $from.depth;
        while (depth > 0 && $from.node(depth).type.name !== "tableRow") depth--;
        if (!depth || $from.node(depth - 1).childCount <= 1) return false;
        if (dispatch) dispatch(state.tr.delete($from.before(depth), $from.after(depth)));
        return true;
      },
      deleteTableColumn: () => ({ state, dispatch }) => {
        const found = findTable(state); if (!found) return false;
        const $from = state.selection.$from; let depth = $from.depth;
        while (depth > found.depth && !["tableCell", "tableHeader"].includes($from.node(depth).type.name)) depth--;
        if (depth <= found.depth) return false;
        const column = $from.index(depth - 1);
        if (found.node.firstChild.childCount <= 1) return false;
        const tr = state.tr; const rows = []; let rowPos = found.pos + 1;
        found.node.forEach(row => { rows.push({ row, pos: rowPos }); rowPos += row.nodeSize; });
        rows.reverse().forEach(({ row, pos }) => {
          const cell = row.child(column);
          if (cell) tr.delete(pos + 1 + row.content.content.slice(0, column).reduce((sum, item) => sum + item.nodeSize, 0), pos + 1 + row.content.content.slice(0, column + 1).reduce((sum, item) => sum + item.nodeSize, 0));
        });
        if (dispatch) dispatch(tr);
        return true;
      },
    };
  },
  parseHTML() { return [{ tag: "table" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", { class: "study-table-scroll" }, ["table", HTMLAttributes, ["tbody", 0]]]; },
});
export const CardTableRow = Node.create({
  name: "tableRow", content: "(tableHeader | tableCell)+", tableRole: "row",
  parseHTML() { return [{ tag: "tr" }]; },
  renderHTML({ HTMLAttributes }) { return ["tr", HTMLAttributes, 0]; },
});
export const CardTableHeader = Node.create({
  name: "tableHeader", content: "block+", isolating: true, tableRole: "header_cell",
  parseHTML() { return [{ tag: "th" }]; },
  renderHTML({ HTMLAttributes }) { return ["th", HTMLAttributes, 0]; },
});
export const CardTableCell = Node.create({
  name: "tableCell", content: "block+", isolating: true, tableRole: "cell",
  parseHTML() { return [{ tag: "td" }]; },
  renderHTML({ HTMLAttributes }) { return ["td", HTMLAttributes, 0]; },
});

export function createCardExtensions() {
  return [
    StarterKit.configure({ paragraph: false, heading: false, undoRedo: { depth: 100 } }),
    AlignedParagraph,
    AlignedHeading,
    Markdown,
    Underline,
    CardTextStyle,
    Color,
    CardLink.configure({ openOnClick: false, autolink: true, protocols: ["http", "https"] }),
    CardImage.configure({ allowBase64: true }),
    CardMath,
    CardVideo,
    CardInfo,
    CardTable,
    CardTableRow,
    CardTableHeader,
    CardTableCell,
  ];
}
