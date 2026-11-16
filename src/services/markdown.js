import katex from "katex";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value) {
  return String(value)
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/\u00a0/g, " ");
}

function safeImageSource(value) {
  return /^(https?:\/\/|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(value) ? value : "";
}

function videoEmbed(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    let source = "";
    if (parsed.hostname === "youtu.be" || parsed.hostname.endsWith("youtube.com")) {
      const id = parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      if (!/^[\w-]{6,20}$/.test(id || "")) return "";
      source = `https://www.youtube-nocookie.com/embed/${id}`;
    } else if (parsed.hostname.endsWith("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (!/^\d+$/.test(id || "")) return "";
      source = `https://player.vimeo.com/video/${id}`;
    } else if (parsed.hostname.endsWith("facebook.com") || parsed.hostname.endsWith("fb.watch")) {
      source = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0`;
    } else if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) {
      return `<video class="study-embedded-video" controls preload="metadata" src="${escapeHtml(url)}"></video>`;
    } else {
      return "";
    }
    return `<div class="study-video-frame"><iframe src="${escapeHtml(source)}" title="Embedded video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  } catch {
    return "";
  }
}

function renderInline(source) {
  let value = escapeHtml(normalizeText(source));
  value = value.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|data:image\/(?:png|jpe?g|gif|webp);base64,[^\s)]+)(?:\s+"([^"]*)")?\)/gi, (_, alt, src, title) => {
    const safe = safeImageSource(src);
    return safe ? `<img class="study-card-image" src="${safe}" alt="${alt}"${title ? ` title="${title}"` : ""} loading="lazy">` : "";
  });
  value = value
    .replace(/\x60([^\x60]+)\x60/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>");
  value = value.replace(/\$([^$\n]+)\$/g, (_, latex) => katex.renderToString(latex, { throwOnError: false, strict: "ignore" }));
  return value.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
}

export function renderMarkdown(source = "") {
  const output = [];
  let paragraph = [];
  let list = null;
  let quote = [];
  let code = [];
  let inCode = false;
  let mathBlock = [];
  let inMath = false;
  const fence = String.fromCharCode(96).repeat(3);

  function flushParagraph() {
    if (paragraph.length) output.push("<p>" + renderInline(paragraph.join(" ")) + "</p>");
    paragraph = [];
  }
  function flushList() {
    if (list) {
      const items = list.items.map((item) => "<li>" + renderInline(item) + "</li>").join("");
      output.push("<" + list.tag + (list.tag === "ol" && list.start > 1 ? ' start="' + list.start + '"' : "") + ">" + items + "</" + list.tag + ">");
    }
    list = null;
  }
  function flushQuote() {
    if (quote.length) output.push("<blockquote>" + renderInline(quote.join(" ")) + "</blockquote>");
    quote = [];
  }
  function flushCode() {
    output.push("<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>");
    code = [];
    inCode = false;
  }
  function flushMath() {
    const latex = mathBlock.join("\n");
    output.push('<div class="study-math-block">' + katex.renderToString(latex, { displayMode: true, throwOnError: false, strict: "ignore" }) + "</div>");
    mathBlock = [];
    inMath = false;
  }

  const lines = normalizeText(source).replaceAll("\r\n", "\n").split("\n");
  for (const line of lines) {
    if (line.trim() === "$$") {
      if (inMath) flushMath();
      else {
        flushParagraph(); flushList(); flushQuote();
        inMath = true;
      }
      continue;
    }
    if (inMath) { mathBlock.push(line); continue; }
    if (line.startsWith(fence)) {
      if (inCode) flushCode();
      else {
        flushParagraph(); flushList(); flushQuote();
        inCode = true;
      }
      continue;
    }
    if (inCode) { code.push(line); continue; }

    const video = line.match(/^\s*@\[video\]\((https?:\/\/[^\s)]+)\)\s*$/);
    if (video) {
      flushParagraph(); flushList(); flushQuote();
      output.push(videoEmbed(video[1]) || '<p class="study-embed-unavailable">This video cannot be embedded by its source.</p>');
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*(\d+)\.\s+(.+)$/);
    const rule = /^\s*(---+|___+|\*\*\*+)\s*$/.test(line);

    if (heading || bullet || ordered || line.startsWith(">") || rule || !line.trim()) flushParagraph();

    if (heading) {
      flushList(); flushQuote();
      const level = heading[1].length;
      output.push("<h" + level + ">" + renderInline(heading[2]) + "</h" + level + ">");
    } else if (bullet || ordered) {
      flushQuote();
      const tag = bullet ? "ul" : "ol";
      if (list && list.tag !== tag) flushList();
      if (!list) list = { tag, items: [], start: ordered ? Number(ordered[1]) : 1 };
      list.items.push((bullet || ordered)[bullet ? 1 : 2]);
    } else if (line.startsWith(">")) {
      flushList();
      quote.push(line.replace(/^>\s?/, ""));
    } else if (rule) {
      flushList(); flushQuote();
      output.push("<hr>");
    } else if (!line.trim()) {
      flushList(); flushQuote();
    } else {
      flushList(); flushQuote();
      paragraph.push(line.trim());
    }
  }

  if (inCode) flushCode();
  if (inMath) flushMath();
  flushParagraph(); flushList(); flushQuote();
  return output.join("\n");
}
