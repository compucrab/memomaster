import test from "node:test";
import assert from "node:assert/strict";
import { cardDocumentText, isCardDocument, renderCardDocument } from "./cardDocument.js";

test("recognizes canonical Tiptap documents", () => {
  assert.equal(isCardDocument({ type: "doc", content: [] }), true);
  assert.equal(isCardDocument("## legacy"), false);
});

test("extracts readable text from nested Tiptap documents", () => {
  const document = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A heading" }] },
      { type: "paragraph", content: [{ type: "text", text: "Body text" }] },
    ],
  };
  assert.equal(cardDocumentText(document), " A heading  Body text");
});

test("renders canonical documents through the shared extension schema", () => {
  const document = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Same document", marks: [{ type: "bold" }] }] }],
  };
  const html = renderCardDocument(document);
  assert.match(html, /<strong>Same document<\/strong>/);
});
