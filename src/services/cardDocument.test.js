import test from "node:test";
import assert from "node:assert/strict";
import { cardDocumentText, isCardDocument, normalizeCardDocument, renderCardDocument } from "./cardDocument.js";

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
  assert.equal(cardDocumentText(document), "A heading Body text");
});

test("normalizes plain text into a canonical Tiptap document in Node", () => {
  assert.deepEqual(normalizeCardDocument("A plain card"), {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "A plain card" }] }],
  });
});

test("renders legacy Markdown without requiring browser DOM APIs", () => {
  assert.match(renderCardDocument("**Same document**"), /<strong>Same document<\/strong>/);
});

// Tiptap's generateHTML serializer uses window/document. Its canonical HTML
// rendering is exercised by the browser app, not Node's DOM-less test runner.
test("renders canonical documents through the shared extension schema", {
  skip: typeof window === "undefined" ? "requires a browser DOM" : false,
}, () => {
  const document = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Same document", marks: [{ type: "bold" }] }] }],
  };
  const html = renderCardDocument(document);
  assert.match(html, /<strong>Same document<\/strong>/);
});
