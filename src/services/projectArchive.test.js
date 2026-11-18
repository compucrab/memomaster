import test from "node:test";
import assert from "node:assert/strict";
import { createMemz, importMemz } from "./projectArchive.js";

const sampleLibrary = () => [{
  id: "notebook-1",
  title: "Archive test",
  color: "#386fae",
  chapters: [{ id: "chapter-1", name: "Foundations" }],
  flashcards: [{
    id: "card-1",
    chapterId: "chapter-1",
    front: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Question" }] }] },
    back: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Answer" }] }] },
    fsrs: { state: 2, due: "2026-11-17T12:00:00.000Z", stability: 4.2 },
  }],
  media: [{ id: "image-1", name: "diagram.png", type: "image/png", data: "data:image/png;base64,AAAA" }],
  studySessions: [{ completedAt: "2026-11-17T12:00:00.000Z", reviewedCards: 1 }],
}];

test("current .memz archive round-trips notebook content, scheduling, history, and media", async () => {
  const source = sampleLibrary();
  const archive = await createMemz(source);
  const restored = await importMemz(archive);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].id, source[0].id);
  assert.equal(restored[0].title, source[0].title);
  assert.deepEqual(restored[0].chapters, source[0].chapters);
  assert.deepEqual(restored[0].flashcards, source[0].flashcards);
  assert.deepEqual(restored[0].media, source[0].media);
  assert.deepEqual(restored[0].studySessions, source[0].studySessions);
});

test("archive import rejects damaged ZIP data", async () => {
  const archive = await createMemz(sampleLibrary());
  const damaged = archive.slice();
  const view = new DataView(damaged.buffer, damaged.byteOffset, damaged.byteLength);
  let centralDirectory = -1;
  for (let offset = 0; offset < damaged.length - 4; offset++) {
    if (view.getUint32(offset, true) === 0x02014b50) { centralDirectory = offset; break; }
  }
  assert.notEqual(centralDirectory, -1);
  damaged[centralDirectory + 16] ^= 0xff;
  await assert.rejects(() => importMemz(damaged), /integrity validation/);
});

test("archive import rejects non-ZIP and truncated input", async () => {
  await assert.rejects(() => importMemz(new Uint8Array([1, 2, 3, 4])), /valid MemoMaster project/);
  await assert.rejects(() => importMemz(new Uint8Array()), /valid MemoMaster project/);
});
