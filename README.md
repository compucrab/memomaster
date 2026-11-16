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
- FSRS-6 scheduled reviews and unscheduled practice for a whole notebook or a chapter.
- Correct Again/Hard/Good/Easy semantics, timed learning and relearning steps, and due-time-aware review queues.
- Reversible scheduled review history with an Undo last review action in the retention dashboard.
- Export complete FSRS-6 review history as CSV for use with the official FSRS optimizer (the optimizer runtime is not yet integrated into the app).
- Configurable desired retention, learning/relearning steps, maximum interval, and study-day rollover.
- Retention dashboard with actual versus desired retention, monthly trend, rating distribution, daily workload forecast, card maturity, and frequently forgotten cards.
- Light and dark themes.
- Automatic SQLite persistence and automatic .memz backup on application close.
- Portable .memz project open/save support and a custom desktop titlebar.

## FSRS scheduling

The scheduler uses `ts-fsrs` (FSRS-6). Default preferences:

| Setting | Default |
| --- | --- |
| Desired retention | 90% |
| Learning steps | 10 minutes |
| Relearning steps | 10 minutes |
| Maximum interval | 180 days |
| Study-day rollover | 04:00 local time |

Review buttons follow these rules:

- **Forgot / Again:** failed recall. Enters a learning or relearning step and returns to the queue only when that step is due.
- **Difficult / Hard:** successful recall with effort. It does not automatically repeat; if the card is still in a learning step, it can return when its actual step becomes due.
- **Good:** advances a learning step or continues the normal review schedule.
- **Easy:** graduates a learning card or continues the normal review schedule.

Use **Export CSV** in FSRS scheduling preferences to export complete review logs in the official optimizer input format. Logs without reliable pre-review state data are excluded and reported. The in-app optimizer is not yet integrated. Changing FSRS preferences affects future scheduling. Existing due dates are not silently recalculated. Each new review stores the before-and-after FSRS state in its review log, allowing the latest scheduled review to be safely undone. Older logs without snapshots remain readable but cannot be undone safely. Preferences are shared across notebooks and stored locally in the application webview; they are not currently embedded in .memz archives. Per-notebook presets are a later iteration.

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

Build and regression checks:

    npm run build
    npm test
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
