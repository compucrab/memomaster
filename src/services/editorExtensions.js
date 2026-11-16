import { Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import { Mathematics } from "@tiptap/extension-mathematics";

const safeMediaUrl = (value = "") => /^(https?:|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(value) ? value : "";

export const CardImage = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), src: { default: null }, alt: { default: null }, title: { default: null }, width: { default: null } };
  },
  parseMarkdown: (token) => ({ type: "image", attrs: { src: safeMediaUrl(token.href), alt: token.text || "", title: token.title || null } }),
  renderMarkdown: ({ node }) => {
    const src = safeMediaUrl(node.attrs.src);
    if (!src) return "";
    return `![${String(node.attrs.alt || "").replace(/[\]\\]/g, "\\$&")}](${src})`;
  },
});

export const AlignedParagraph = Paragraph.extend({
  renderMarkdown: ({ node, helpers }) => {
    const content = helpers.renderChildren(node.content || []);
    const align = node.attrs?.textAlign;
    return align && align !== "left" ? `<p style="text-align:${align}">${content}</p>` : content;
  },
});

export const AlignedHeading = Heading.extend({
  renderMarkdown: ({ node, helpers }) => {
    const content = helpers.renderChildren(node.content || []);
    const level = node.attrs?.level || 1;
    const align = node.attrs?.textAlign;
    return align && align !== "left" ? `<h${level} style="text-align:${align}">${content}</h${level}>` : `${"#".repeat(level)} ${content}`;
  },
});

export const CardVideo = Node.create({
  name: "cardVideo",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { url: { default: "" }, provider: { default: "video" } };
  },
  parseHTML() { return [{ tag: "div[data-card-video]" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-card-video": "", "data-url": HTMLAttributes.url, "data-provider": HTMLAttributes.provider }, "Embedded video"];
  },
  markdownTokenizer: {
    name: "cardVideo",
    level: "block",
    start: (source) => source.indexOf("@[video]("),
    tokenize(source) {
      const match = /^@\[video\]\((https?:\/\/[^\s)]+)\)/.exec(source);
      if (!match) return undefined;
      return { type: "cardVideo", raw: match[0], href: match[1] };
    },
  },
  parseMarkdown: (token) => ({ type: "cardVideo", attrs: { url: token.href || "", provider: "video" } }),
  renderMarkdown: ({ node }) => {
    const url = safeMediaUrl(node.attrs.url);
    return url ? `@[video](${url})` : "";
  },
});

export const CardMath = Mathematics.configure({
  katexOptions: { throwOnError: false, strict: "ignore" },
});
