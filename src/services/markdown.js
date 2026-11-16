function escapeHtml(value) {
  return value
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

function renderInline(source) {
  return escapeHtml(normalizeText(source))
    .replace(/\x60([^\x60]+)\x60/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(
      /\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,
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
  const fence = String.fromCharCode(96).repeat(3);

  function flushParagraph() {
    if (paragraph.length) output.push("<p>" + renderInline(paragraph.join(" ")) + "</p>");
    paragraph = [];
  }
  function flushList() {
    if (list) {
      const items = list.items.map((item) => "<li>" + renderInline(item) + "</li>").join("");
      output.push("<" + list.tag + ">" + items + "</" + list.tag + ">");
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

  const lines = normalizeText(source).replaceAll("\r\n", "\n").split("\n");
  for (const line of lines) {
    if (line.startsWith(fence)) {
      if (inCode) flushCode();
      else {
        flushParagraph(); flushList(); flushQuote();
        inCode = true;
      }
      continue;
    }
    if (inCode) { code.push(line); continue; }

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
  flushParagraph(); flushList(); flushQuote();
  return output.join("\n");
}
