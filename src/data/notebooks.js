export const initialNotebooks = [
  {
    id: "rust",
    title: "Rust Programming",
    color: "#a9b27a",
    chapters: [
      { id: "rust-basics", name: "Rust fundamentals", topics: [{ id: "rust-ownership-topic", name: "Ownership" }, { id: "rust-borrowing-topic", name: "Borrowing" }] },
      { id: "rust-memory", name: "Memory management", topics: [{ id: "rust-box-topic", name: "Smart pointers" }] },
    ],
    cards: 2,
    updated: "Edited today",
    flashcards: [
      { id: "rust-ownership", front: "## What is ownership in Rust?", back: "A set of rules that governs how memory is managed, without a garbage collector.", chapterId: "rust-basics", topicId: "rust-ownership-topic" },
      { id: "rust-borrowing", front: "## What does borrowing allow?", back: "Using a value through references without taking ownership of it.", chapterId: "rust-basics", topicId: "rust-borrowing-topic" },
    ],
  },
  {
    id: "graphics",
    title: "Computer Graphics",
    color: "#c58f76",
    chapters: [
      { id: "graphics-rendering", name: "Rendering pipeline", topics: [{ id: "graphics-raster-topic", name: "Rasterization" }, { id: "graphics-depth-topic", name: "Depth testing" }] },
    ],
    cards: 2,
    updated: "Edited yesterday",
    flashcards: [
      { id: "graphics-raster", front: "## What is rasterization?", back: "Converting geometric primitives into fragments or pixels on a screen.", chapterId: "graphics-rendering", topicId: "graphics-raster-topic" },
      { id: "graphics-depth", front: "## What does a depth buffer store?", back: "Depth values used to determine which surface is visible at each pixel.", chapterId: "graphics-rendering", topicId: "graphics-depth-topic" },
    ],
  },
  {
    id: "history",
    title: "World History",
    color: "#8c9eaf",
    chapters: [{ id: "history-print", name: "The age of revolutions", topics: [{ id: "history-print-topic", name: "Printing and knowledge" }] }],
    cards: 1,
    updated: "Edited 3 days ago",
    flashcards: [
      { id: "history-print-card", front: "## Why was the printing press transformative?", back: "It made written knowledge cheaper to reproduce and distribute at scale.", chapterId: "history-print", topicId: "history-print-topic" },
    ],
  },
  {
    id: "design",
    title: "Visual Design",
    color: "#b39abf",
    chapters: [{ id: "design-principles", name: "Design principles", topics: [{ id: "design-contrast-topic", name: "Contrast" }] }],
    cards: 1,
    updated: "Edited last week",
    flashcards: [
      { id: "design-contrast", front: "## What is visual contrast?", back: "A noticeable difference between elements that creates hierarchy and emphasis.", chapterId: "design-principles", topicId: "design-contrast-topic" },
    ],
  },
];
