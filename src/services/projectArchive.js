const encoder = new TextEncoder();
const decoder = new TextDecoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let value = 0; value < 256; value++) {
    let crc = value;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    table[value] = crc >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function uint16(value) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
function uint32(value) {
  return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
}
function concatenate(parts) {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}
async function compress(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function decompress(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
function getDosTimestamp() {
  const date = new Date();
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}
async function createZip(files) {
  const localEntries = [];
  const centralEntries = [];
  const timestamp = getDosTimestamp();
  let localOffset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const original = encoder.encode(file.content);
    const compressed = await compress(original);
    const checksum = crc32(original);
    const localHeader = concatenate([
      uint32(0x04034b50), uint16(20), uint16(0x0800), uint16(8),
      uint16(timestamp.time), uint16(timestamp.date), uint32(checksum),
      uint32(compressed.length), uint32(original.length), uint16(name.length),
      uint16(0), name, compressed,
    ]);
    localEntries.push(localHeader);
    centralEntries.push(concatenate([
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0x0800), uint16(8),
      uint16(timestamp.time), uint16(timestamp.date), uint32(checksum),
      uint32(compressed.length), uint32(original.length), uint16(name.length),
      uint16(0), uint16(0), uint16(0), uint16(0), uint32(0), uint32(localOffset), name,
    ]));
    localOffset += localHeader.length;
  }
  const centralDirectory = concatenate(centralEntries);
  const endRecord = concatenate([
    uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length),
    uint16(files.length), uint32(centralDirectory.length), uint32(localOffset), uint16(0),
  ]);
  return concatenate([...localEntries, centralDirectory, endRecord]);
}

export async function exportMemz(notebooks) {
  const files = [];
  const notebookIds = [];
  for (const notebook of notebooks) {
    if (!/^[\w-]{1,100}$/.test(notebook.id)) throw new Error("Invalid notebook identifier");
    notebookIds.push(notebook.id);
    const { markdown, ...metadata } = notebook;
    const cards = notebook.flashcards ?? (markdown ? [{ id: "legacy-card", front: "What is this note about?", back: markdown }] : []);
    files.push({
      name: `notebooks/${notebook.id}/notebook.json`,
      content: JSON.stringify({ ...metadata, cards: cards.length, flashcards: undefined }, null, 2),
    });
    cards.forEach((card, index) => {
      const cardId = /^[\w-]{1,100}$/.test(card.id ?? "") ? card.id : `card-${index + 1}`;
      files.push({
        name: `notebooks/${notebook.id}/cards/${cardId}.json`,
        content: JSON.stringify({
          id: cardId,
          front: card.front ?? "",
          back: card.back ?? "",
          chapterId: card.chapterId ?? "",
          topicId: card.topicId ?? "",
        }, null, 2),
      });
    });
  }
  files.unshift({
    name: "manifest.json",
    content: JSON.stringify({ format: "memomaster", version: 2, notebooks: notebookIds }, null, 2),
  });
  const archive = await createZip(files);
  const url = URL.createObjectURL(new Blob([archive], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "memomaster-library.memz";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importMemz(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let endOffset = -1;
  const searchStart = Math.max(0, bytes.length - 65557);
  for (let offset = bytes.length - 22; offset >= searchStart; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw new Error("This file is not a valid ZIP archive");
  const entryCount = view.getUint16(endOffset + 10, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);
  if (entryCount > 20000) throw new Error("Archive contains too many entries");
  const files = new Map();
  let cursor = directoryOffset;
  for (let index = 0; index < entryCount; index++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("Invalid ZIP directory");
    const method = view.getUint16(cursor + 10, true);
    const checksum = view.getUint32(cursor + 16, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const originalSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    if (name.startsWith("/") || name.includes("..") || name.includes("\\")) throw new Error("Unsafe archive path");
    if (originalSize > 20_000_000) throw new Error("An archive entry is too large");
    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("Invalid ZIP entry");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    let original;
    if (method === 8) original = await decompress(compressed);
    else if (method === 0) original = compressed;
    else throw new Error("Unsupported ZIP compression method");
    if (original.length !== originalSize || crc32(original) !== checksum) throw new Error("Archive entry failed integrity validation");
    files.set(name, decoder.decode(original));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  const manifestText = files.get("manifest.json");
  if (!manifestText) throw new Error("Missing MemoMaster manifest");
  const manifest = JSON.parse(manifestText);
  if (manifest.format !== "memomaster" || ![1, 2].includes(manifest.version) || !Array.isArray(manifest.notebooks)) {
    throw new Error("Unsupported MemoMaster project format");
  }
  return manifest.notebooks.map((id) => {
    if (typeof id !== "string" || !/^[\w-]{1,100}$/.test(id)) throw new Error("Invalid notebook identifier");
    const metadata = files.get(`notebooks/${id}/notebook.json`);
    if (!metadata) throw new Error(`Notebook data is missing: ${id}`);
    const notebook = JSON.parse(metadata);
    if (notebook.id !== id || typeof notebook.title !== "string") throw new Error("Invalid notebook metadata");
    let flashcards;
    if (manifest.version === 1) {
      const oldMarkdown = files.get(`notebooks/${id}/cards/first-card.md`) ?? "";
      flashcards = oldMarkdown ? [{ id: "legacy-card", front: "What is this note about?", back: oldMarkdown }] : [];
    } else {
      flashcards = [...files.entries()]
        .filter(([path]) => path.startsWith(`notebooks/${id}/cards/`) && path.endsWith(".json"))
        .map(([, content]) => JSON.parse(content));
    }
    return { ...notebook, chapters: Array.isArray(notebook.chapters) ? notebook.chapters : [], flashcards, cards: flashcards.length };
  });
}
