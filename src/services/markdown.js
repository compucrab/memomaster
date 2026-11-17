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
    const host = parsed.hostname.toLowerCase();
    const supported = host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com") || host === "vimeo.com" || host.endsWith(".vimeo.com") || host === "instagram.com" || host.endsWith(".instagram.com") || host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch" || [".mp4", ".webm", ".ogg"].some(extension => parsed.pathname.toLowerCase().endsWith(extension));
      || host === "vimeo.com" || host.endsWith(".vimeo.com")
      || host === "instagram.com" || host.endsWith(".instagram.com")
      || host === "facebook.com" || host.endsWith(".facebook.com")
      || host === "fb.watch" || /\\.(mp4|webm|ogg)$/i.test(parsed.pathname);
    if (!supported) return "";
    const safeUrl = escapeHtml(parsed.href);
    const provider = (host.includes("youtube") || host === "youtu.be") ? "YouTube" : host.includes("vimeo") ? "Vimeo" : host.includes("instagram") ? "Instagram" : (host.includes("facebook") || host === "fb.watch") ? "Facebook" : "Video file";
      : /vimeo/.test(host) ? "Vimeo"
      : /instagram/.test(host) ? "Instagram"
      : /facebook|fb\\.watch/.test(host) ? "Facebook" : "Video file";
    return `<a class="study-video-card" href="${safeUrl}" target="_blank" rel="noopener noreferrer"><span class="study-video-card-icon">▶</span><span><strong>Open ${provider} video</strong><small>Opens in your browser</small></span><span class="study-video-card-arrow">↗</span></a>`;
  } catch {
    return "";
  }
}

function renderInline(source, mediaMap = new Map()) {
  const styledSpans = [];
  const prepared = normalizeText(source).replace(/<span\s+style=["']([^"']*)["']>([\s\S]*?)<\/span>/gi, (match, rawStyle, inner) => {
    const safeStyles = [];
    String(rawStyle).split(";").forEach(declaration => {
      const separator = declaration.indexOf(":");
      if (separator < 0) return;
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const styleValue = declaration.slice(separator + 1).trim();
      if (property === "color" && /^(#[0-9a-f]{3,8}|rgba?\([\d.% ,]+\)|hsla?\([\d.% ,]+\)|[a-z]{3,20})$/i.test(styleValue)) safeStyles.push("color:" + styleValue);
      if (property === "font-size" && /^\d{1,2}(?:px|pt|rem|em)$/.test(styleValue)) safeStyles.push("font-size:" + styleValue);
    });
    if (!safeStyles.length) return inner;
    const token = "\u0000STYLE" + styledSpans.length + "\u0000";
    styledSpans.push({ token, html: '<span style="' + safeStyles.join(";") + '">' + renderInline(inner, mediaMap) + "</span>" });
    return token;
  });
  let value = escapeHtml(prepared);
  styledSpans.forEach(({ token, html }) => { value = value.replace(token, html); });
  value = value.replace(/!\[([^\]]*)\]\(((?:https?:\/\/|memomedia:\/\/[\w-]+|data:image\/(?:png|jpe?g|gif|webp);base64,)[^\s)]+)(?:\s+&quot;([^&]*?)&quot;)?\)/gi, (_, alt, src, title) => {
    const rawSrc = src.replaceAll("&amp;", "&");
    const mediaId = rawSrc.match(/^memomedia:\/\/([\w-]+)$/)?.[1];
    const safe = mediaId ? mediaMap.get(mediaId)?.data || "" : safeImageSource(rawSrc);
    const metadata = String(title || "").match(/width=(\d+);align=(left|center|right)/);
    const width = metadata ? Math.max(40, Math.min(1600, Number(metadata[1]))) : 420;
    const align = metadata ? metadata[2] : "center";
    const style = `width:${width}px;max-width:100%;display:block;margin:12px ${align === "left" ? "auto 0" : align === "right" ? "0 auto" : "auto"};`;
    return safe ? `<img class="study-card-image" src="${safe}" alt="${escapeHtml(alt)}" style="${style}" loading="lazy">` : "";
  });
  value = value
    .replace(/\x60([^\x60]+)\x60/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>");
  value = value.replace(/\$\$([^$\n]+)\$\$/g, (_, latex) => katex.renderToString(latex, { throwOnError: false, strict: "ignore" }));
  value = value.replace(/(?<!\$)\$([^$\n]+)\$(?!\$)/g, (_, latex) => katex.renderToString(latex, { throwOnError: false, strict: "ignore" }));
  return value.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
}

export function renderMarkdown(source = "", media = []) {
  const mediaMap = new Map((Array.isArray(media) ? media : []).map(asset => [asset.id, asset]));
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
    if (paragraph.length) output.push("<p>" + renderInline(paragraph.join(" "), mediaMap) + "</p>");
    paragraph = [];
  }
  function flushList() {
    if (list) {
      const items = list.items.map((item) => "<li>" + renderInline(item, mediaMap) + "</li>").join("");
      output.push("<" + list.tag + (list.tag === "ol" && list.start > 1 ? ' start="' + list.start + '"' : "") + ">" + items + "</" + list.tag + ">");
    }
    list = null;
  }
  function flushQuote() {
    if (quote.length) output.push("<blockquote>" + renderInline(quote.join(" "), mediaMap) + "</blockquote>");
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
    const displayMath = line.match(/^\s*\$\$\$([\s\S]+)\$\$\$\s*$/) || line.match(/^\s*\$\$([\s\S]+)\$\$\s*$/);
    if (displayMath) {
      flushParagraph(); flushList(); flushQuote();
      output.push('<div class="study-math-block">' + katex.renderToString(displayMath[1], { displayMode: true, throwOnError: false, strict: "ignore" }) + "</div>");
      continue;
    }
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

    const aligned = line.match(/^<(p|h[1-5]) style="text-align:(center|right)">([\s\S]*)<\/\1>$/i);
    if (aligned) {
      flushParagraph(); flushList(); flushQuote();
      const tag = aligned[1].toLowerCase();
      output.push(`<${tag} style="text-align:${aligned[2]}">${renderInline(aligned[3], mediaMap)}</${tag}>`);
      continue;
    }
 
    const video = line.match(/^\s*@\[video\]\((https?:\/\/[^\s)]+)\)\s*$/);
    if (video) {
      flushParagraph(); flushList(); flushQuote();
      output.push(videoEmbed(video[1]) || '<p class="study-embed-unavailable">This video cannot be embedded by its source.</p>');
      continue;
    }

    const heading = line.match(/^(#{1,5})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*(\d+)\.\s+(.+)$/);
    const rule = /^\s*(---+|___+|\*\*\*+)\s*$/.test(line);

    if (heading || bullet || ordered || line.startsWith(">") || rule || !line.trim()) flushParagraph();

    if (heading) {
      flushList(); flushQuote();
      const level = heading[1].length;
      output.push("<h" + level + ">" + renderInline(heading[2], mediaMap) + "</h" + level + ">");
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
