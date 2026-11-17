import test from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "./markdown.js";

test("renders heading levels one through five", () => {
  const html = renderMarkdown("# One\n## Two\n### Three\n#### Four\n##### Five");
  for (let level = 1; level <= 5; level++) assert.ok(html.includes(`<h${level}>`));
});

test("preserves safe text color and font size spans", () => {
  const html = renderMarkdown('<span style="color: rgb(20, 40, 60); font-size: 18px">Styled text</span>');
  assert.ok(html.includes('color:rgb(20, 40, 60)'));
  assert.ok(html.includes('font-size:18px'));
  assert.ok(html.includes("Styled text"));
});

test("resolves notebook media references in previews", () => {
  const html = renderMarkdown('![Diagram](memomedia://asset-1 "width=320;align=left")', [
    { id: "asset-1", data: "data:image/png;base64,AAAA", name: "Diagram" },
  ]);
  assert.ok(html.includes('src="data:image/png;base64,AAAA"'));
  assert.ok(html.includes("width:320px"));
  assert.ok(html.includes("display:block"));
});

test("renders video links as cards instead of embedded players", () => {
  const html = renderMarkdown("@[video](https://youtu.be/abcdefghijk)");
  assert.ok(html.includes('class="study-video-card"'));
  assert.ok(html.includes('target="_blank"'));
  assert.ok(!html.includes("<iframe"));
  assert.ok(!html.includes("<video"));
});

test("renders markdown links as styled, safe links", () => {
  const html = renderMarkdown("Visit [the reference](https://example.com/docs) now");
  assert.ok(html.includes('<a href="https://example.com/docs"'));
  assert.ok(html.includes(">the reference</a>"));
});
