export const initialNotebooks = [
  {
    id: "rust",
    title: "Rust Programming",
    description: "Ownership, memory safety, concurrency and systems programming.",
    color: "#a9b27a",
    chapters: 8,
    cards: 2,
    updated: "Edited today",
    flashcards: [
      { id: "rust-ownership", front: "## What is ownership in Rust?", back: "A set of rules that governs how memory is managed, without a garbage collector." },
      { id: "rust-borrowing", front: "## What does borrowing allow?", back: "Using a value through references without taking ownership of it." },
    ],
  },
  {
    id: "graphics",
    title: "Computer Graphics",
    description: "Rendering fundamentals, geometry, shaders and visual mathematics.",
    color: "#c58f76",
    chapters: 5,
    cards: 2,
    updated: "Edited yesterday",
    flashcards: [
      { id: "graphics-raster", front: "## What is rasterization?", back: "Converting geometric primitives into fragments or pixels on a screen." },
      { id: "graphics-depth", front: "## What does a depth buffer store?", back: "Depth values used to determine which surface is visible at each pixel." },
    ],
  },
  {
    id: "history",
    title: "World History",
    description: "A collection of events, people and ideas worth remembering.",
    color: "#8c9eaf",
    chapters: 12,
    cards: 1,
    updated: "Edited 3 days ago",
    flashcards: [
      { id: "history-print", front: "## Why was the printing press transformative?", back: "It made written knowledge cheaper to reproduce and distribute at scale." },
    ],
  },
  {
    id: "design",
    title: "Visual Design",
    description: "Composition, colour theory, typography and visual language.",
    color: "#b39abf",
    chapters: 4,
    cards: 1,
    updated: "Edited last week",
    flashcards: [
      { id: "design-contrast", front: "## What is visual contrast?", back: "A noticeable difference between elements that creates hierarchy and emphasis." },
    ],
  },
];
