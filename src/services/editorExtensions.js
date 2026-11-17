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
export const CardVideo = Node.create({
  name: "cardVideo", group: "block", atom: true, selectable: true,
  addAttributes() { return { url: { default: "" }, provider: { default: "video" } }; },
  parseHTML() { return [{ tag: "div[data-card-video]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", { "data-card-video": "", "data-url": HTMLAttributes.url, "data-provider": HTMLAttributes.provider }, "Video link — opens in browser"]; },
  markdownTokenizer: {
    name: "cardVideo", level: "block", start: (source) => source.indexOf("@[video]("),
    tokenize(source) { const match = /^@\[video\]\((https?:\/\/[^\s)]+)\)/.exec(source); return match ? { type: "cardVideo", raw: match[0], href: match[1] } : undefined; },
  },
  parseMarkdown: (token) => ({ type: "cardVideo", attrs: { url: token.href || "", provider: "video" } }),
  renderMarkdown: (node) => { const url = safeMediaUrl(node?.attrs?.url); return url ? `@[video](${url})` : ""; },
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
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attributes => {
          const size = String(attributes.fontSize || "");
          return /^\d{1,2}(?:px|pt|rem|em)$/.test(size) ? { style: `font-size:${size}` } : {};
        },
      },
    };
  },
  renderMarkdown(mark, helpers) {
    const attrs = mark?.attrs || {};
    const styles = [];
    const color = String(attrs.color || "");
    const size = String(attrs.fontSize || "");
    if (/^(#[0-9a-f]{3,8}|rgba?\([\d.% ,]+\)|hsla?\([\d.% ,]+\)|[a-z]{3,20})$/i.test(color)) styles.push("color:" + color);
    if (/^\d{1,2}(?:px|pt|rem|em)$/.test(size)) styles.push("font-size:" + size);
    const content = helpers.renderChildren(mark);
    return styles.length ? '<span style="' + styles.join(";") + '">' + content + "</span>" : content;
  },
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
  ];
}
