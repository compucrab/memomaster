import { Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import { Mathematics } from "@tiptap/extension-mathematics";
const safeMediaUrl = (value = "") => /^(https?:|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(value) ? value : "";
export const CardImage = Image.extend({
  inline: true,
  addAttributes() { return { ...this.parent?.(), src: { default: null }, alt: { default: null }, title: { default: null }, width: { default: 420 }, align: { default: "center" } }; },
  renderHTML({ HTMLAttributes }) {
    const width = Math.max(40, Math.min(1600, Number(HTMLAttributes.width) || 420));
    const align = ["left", "center", "right"].includes(HTMLAttributes.align) ? HTMLAttributes.align : "center";
    const style = `width:${width}px;max-width:100%;display:block;margin:12px ${align === "left" ? "auto 0" : align === "right" ? "0 auto" : "auto"};`;
    return ["img", { ...this.options.HTMLAttributes, ...HTMLAttributes, style, "data-image-align": align, "data-image-width": width }];
  },
  parseMarkdown(token) {
    const metadata = String(token.title || "").match(/width=(\d+);align=(left|center|right)/);
    return { type: "image", attrs: { src: safeMediaUrl(token.href), alt: token.text || "", title: null, width: metadata ? Number(metadata[1]) : 420, align: metadata ? metadata[2] : "center" } };
  },
  renderMarkdown(node) {
    const attrs = node?.attrs || {};
    const src = safeMediaUrl(attrs.src);
    if (!src) return "";
    const alt = String(attrs.alt || "").replace(/[\\\]]/g, "\\$&");
    const width = Math.max(40, Math.min(1600, Number(attrs.width) || 420));
    const align = ["left", "center", "right"].includes(attrs.align) ? attrs.align : "center";
    return "![" + alt + "](" + src + ' "width=' + width + ";align=" + align + '")';
  },
});
export const AlignedParagraph = Paragraph;
export const AlignedHeading = Heading.configure({ levels: [1, 2, 3, 4, 5] });
export const CardVideo = Node.create({
  name: "cardVideo", group: "block", atom: true, selectable: true,
  addAttributes() { return { url: { default: "" }, provider: { default: "video" } }; },
  parseHTML() { return [{ tag: "div[data-card-video]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", { "data-card-video": "", "data-url": HTMLAttributes.url, "data-provider": HTMLAttributes.provider }, "Embedded video"]; },
  markdownTokenizer: {
    name: "cardVideo", level: "block", start: (source) => source.indexOf("@[video]("),
    tokenize(source) { const match = /^@\[video\]\((https?:\/\/[^\s)]+)\)/.exec(source); return match ? { type: "cardVideo", raw: match[0], href: match[1] } : undefined; },
  },
  parseMarkdown: (token) => ({ type: "cardVideo", attrs: { url: token.href || "", provider: "video" } }),
  renderMarkdown: (node) => { const url = safeMediaUrl(node?.attrs?.url); return url ? `@[video](${url})` : ""; },
});
export const CardMath = Mathematics.configure({ katexOptions: { throwOnError: false, strict: "ignore" } });
