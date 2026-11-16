import Image from "@tiptap/extension-image";
import { Node } from "@tiptap/core";
import { Mathematics } from "@tiptap/extension-mathematics";

const safeMediaUrl = (value = "") => /^(https?:|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(value) ? value : "";

export const CardImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
    };
  },
  parseMarkdown: (token) => ({
    type: "image",
    attrs: { src: safeMediaUrl(token.href), alt: token.text || "", title: token.title || null },
  }),
  renderMarkdown: ({ node }) => {
    const src = safeMediaUrl(node.attrs.src);
    if (!src) return "";
    return `![${String(node.attrs.alt || "").replace(/[\]\\]/g, "\\$&")}](${src})`;
  },
});

export const CardVideo = Node.create({
  name: "cardVideo",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      url: { default: "" },
      provider: { default: "video" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-card-video]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-card-video": "", "data-url": HTMLAttributes.url, "data-provider": HTMLAttributes.provider }, "Video embed"];
  },
  markdownTokenizer: {
    name: "cardVideo",
    level: "block",
    start: (source) => source.indexOf("@[video]("),
    tokenizer(source) {
      const match = /^@\[video\]\((https?:\/\/[^\s)]+)\)/.exec(source);
      if (!match) return undefined;
      return { type: "cardVideo", raw: match[0], href: match[1] };
    },
  },
  parseMarkdown: (token) => ({
    type: "cardVideo",
    attrs: { url: token.href || "", provider: "video" },
  }),
  renderMarkdown: ({ node }) => {
    const url = safeMediaUrl(node.attrs.url);
    return url ? `@[video](${url})` : "";
  },
});

export const CardMath = Mathematics.configure({
  katexOptions: { throwOnError: false, strict: "ignore" },
});
