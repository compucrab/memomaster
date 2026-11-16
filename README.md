# MemoMaster

MemoMaster is a desktop-first, local learning workspace built with **Tauri 2, Preact, Vite, and Rust**. It organizes study material into notebooks, chapters, topics, and Markdown flashcards.

> **Current status:** early application shell. The library and study interface are interactive, but notebook data is currently held in frontend memory. Durable local database storage, FSRS scheduling, and sync are not implemented yet.

## Current features

- Notebook library with search, creation, rename, and cover-strip colour selection from the context menu.
- Notebook hierarchy: chapters and topics, with cards assignable to both.
- Focused flashcard view with question/answer reveal and a live WYSIWYG editor.
- Rich-text formatting with keyboard shortcuts; card content remains stored as Markdown.
- Light and dark themes; the selected theme is stored in local browser storage.
- Import and export of portable `.memz` ZIP project archives.
- Custom desktop titlebar and window controls.

## Technology

| Area | Technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Native backend | Rust |
| UI | Preact + JavaScript |
| Build tooling | Vite |
| Styling | Tailwind CSS v4 + project CSS |
| Icons | lucide-preact |
| Project archive | Browser Compression Streams + custom ZIP reader/writer |

The Rust application currently initializes the Tauri window and opener plugin. Application state, archive handling, and Markdown rendering currently live in the frontend.

## Requirements

- Node.js with npm
- Rust toolchain supported by Tauri 2
- Tauri platform prerequisites for your operating system

See the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) before building.

## Setup

```sh
npm install
npm run tauri dev
```

Build the frontend:

```sh
npm run build
```

Build the desktop application:

```sh
npm run tauri build
```

Vite uses port `1420`; the Tauri configuration expects that fixed development port.

## Project documents

- [Architecture](ARCHITECTURE.md) — runtime, modules, state ownership, data model, and current boundaries.
- [Agent guide](AGENTS.md) — coding conventions, safety rules, workflows, and implementation guidance for coding agents.

## Important boundaries

- Use JavaScript for frontend code. Do not introduce TypeScript without an explicit project decision.
- Keep the app desktop-first; do not add mobile-specific navigation.
- Keep Rust responsible for native integration and future persistence/domain operations. Avoid moving UI concerns into Rust.
- Do not describe planned functionality as implemented. In particular, FSRS, SQLite persistence, cloud sync, and Anki import are future work.
- Preserve backward compatibility with supported `.memz` archive versions when changing the archive format.
