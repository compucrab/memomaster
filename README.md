# MemoMaster

MemoMaster is a desktop-first, local learning workspace built with Tauri 2, Preact, Vite, and Rust. It organizes study material into notebooks, chapters, topics, and Markdown flashcards.

## Current features

- Empty notebook library on first launch.
- Notebook hierarchy: chapters and topics, with cards assignable to both.
- Focused flashcard view with question/answer reveal and a live WYSIWYG editor.
- Rich-text formatting with keyboard shortcuts; card content remains stored as Markdown.
- Light and dark themes.
- Automatic local library persistence using SQLite.
- One portable backup format: .memz project archives.
- Native Open and Save dialogs.
- Custom desktop titlebar and window controls.

## Local data and backups

- SQLite library: stored in the operating system's application-data directory. Changes are saved automatically and restored when MemoMaster starts.
- .memz: the complete library, including every notebook, chapter, topic, flashcard, and related content. Use it to create a manual backup or restore a library on another installation.

The SQLite database is the active working copy. A .memz file is a portable snapshot; saving it is an explicit manual action. MemoMaster does not create sample notebooks or individual notebook files.

## Technology

| Area | Technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Native backend | Rust |
| Local database | SQLite via rusqlite |
| UI | Preact + JavaScript |
| Build tooling | Vite |
| Styling | Tailwind CSS v4 + project CSS |
| Icons | lucide-preact |

## Requirements

- Node.js with npm
- Rust toolchain supported by Tauri 2
- Tauri platform prerequisites for your operating system

See the Tauri prerequisites at https://v2.tauri.app/start/prerequisites/.

## Setup

Run npm install, then npm run tauri dev.

Build the frontend with npm run build. Build the desktop application with npm run tauri build.

Vite uses port 1420; the Tauri configuration expects that fixed development port.

## Project documents

- ARCHITECTURE.md — runtime, modules, state ownership, data model, and current boundaries.
- AGENTS.md — coding conventions, safety rules, workflows, and implementation guidance for coding agents.

## Important boundaries

- Use JavaScript for frontend code. Do not introduce TypeScript without an explicit project decision.
- Keep the app desktop-first; do not add mobile navigation.
- Keep Rust responsible for native integration and local persistence.
- FSRS, Anki import/export, cloud sync, and multi-device synchronization are future work.
- Preserve backward compatibility with supported .memz archive versions when changing the archive format.
