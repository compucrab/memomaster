# MemoMaster

MemoMaster is a local-first desktop learning and revision app built with Tauri 2, Preact, Vite, and Rust. It organizes material into notebooks, chapters, and flashcards.

## Features

- Notebook library with notebook creation, rename, deletion, and cover-strip colour selection.
- Notebook workspace with Browse and Study tabs.
- Browse cards with question/answer search, chapter filtering, preview, editing, multi-selection, bulk deletion, chapter reassignment, and schedule reset.
- Duplicate-question detection: exact duplicates are blocked and close matches are flagged before saving.
- Rich card editor with separate Question and Answer tabs.
- Markdown-based card content with bold, italic, underline, headings, lists, quotes, inline code, links, and text colour.
- Image insertion from files or clipboard, with per-image size and alignment controls. Images are embedded in card content (up to 12 MB per inserted image).
- Inline and display LaTeX equations rendered with KaTeX.
- Video embeds for YouTube, Vimeo, Instagram public posts/reels, Facebook, and direct MP4/WebM/OGG URLs. Playback depends on the provider's embedding policy.
- Separate undo/redo history for the Question and Answer editors.
- Scheduled FSRS-6 reviews and unscheduled practice for a whole notebook or a chapter.
- Scheduled ratings: Forgot, Difficult, Good, and Easy. Forgot and Difficult repeat the card in the current session; Good and Easy complete it.
- Next-review intervals during review, and next due date/time in Browse card information.
- Study status dashboard with activity heatmap, streaks, scheduled review outcomes, recall rate, upcoming reviews, and notebook progress.
- Light and dark themes.
- Automatic SQLite persistence and automatic .memz backup on application close.
- Portable .memz project open/save support and a custom desktop titlebar.

## Local storage and backups

MemoMaster uses two forms of local storage:

- **SQLite working copy:** The active library is saved automatically in the operating system's application-data directory and restored on launch. Ordinary editing does not require a manual save.
- **.memz project archive:** A portable ZIP snapshot containing notebooks, chapters, cards, FSRS state, and study history.

The File menu provides New project, Open project, Save project, and Preferences.

- **New project** replaces the active library with an empty one and clears the remembered project path. It does not delete existing backups.
- **Open project** imports a .memz archive, replaces the active library, and makes that file the remembered Save project destination.
- **Save project** overwrites the remembered .memz file when one exists. If no project file is associated, it creates a timestamped backup in the application's backups folder.
- **Automatic backup** creates a timestamped .memz snapshot in that same backups folder when the application closes successfully.

A .memz archive is a snapshot, not a live link to SQLite. Changes made after a snapshot do not update it. Keep independent backups; the SQLite working copy is not a substitute for an external backup.

## Technology

| Area | Technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Native backend | Rust |
| Local database | SQLite via rusqlite |
| UI | Preact + JavaScript |
| Build tooling | Vite |
| Styling | Tailwind CSS v4 + project CSS |
| Editor | Tiptap + Markdown |
| Repetition | ts-fsrs (FSRS-6) |
| Math rendering | KaTeX |
| Icons | lucide-preact |

## Requirements and setup

- Node.js with npm
- Rust toolchain supported by Tauri 2
- Tauri platform prerequisites for your operating system

See the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

Install dependencies and run the desktop app:

    npm install
    npm run tauri dev

Build checks:

    npm run build
    npm run tauri build

Vite uses port 1420; the Tauri configuration expects that fixed development port.

## Project documents

- [ARCHITECTURE.md](ARCHITECTURE.md) — runtime, modules, state ownership, persistence, and data model.
- [AGENTS.md](AGENTS.md) — coding conventions, safety rules, and implementation workflow.

## Boundaries

- Frontend code is JavaScript/JSX; do not introduce TypeScript without an explicit project decision.
- MemoMaster is desktop-first and local-first. No cloud account, analytics, or sync backend is implemented.
- Anki import/export and multi-device synchronization are not implemented.
- Preserve .memz archive compatibility when changing its format.
