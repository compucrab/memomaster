# MemoMaster

MemoMaster is a desktop-first, local learning workspace built with Tauri 2, Preact, Vite, and Rust. It organizes study material into notebooks, chapters, topics, and Markdown flashcards.

## Current features

- Empty library on first launch, with no prebuilt notebooks.
- Create a new empty project at any time.
- Notebook hierarchy: chapters and topics, with cards assignable to both.
- Notebook workspace with separate Browse and Study tabs.
- Two-column card browsing with question/answer search, chapter/topic filters, and a selected-card preview.
- Scheduled FSRS reviews and unscheduled practice for a whole notebook, chapter, or topic. Unscheduled practice never changes due dates.
- FSRS-6 spaced repetition with Forgot, Difficult, and Easy review choices and visible next-review intervals.
- Study status dashboard with a GitHub-style yearly consistency graph, streaks, recall rate, review outcomes, upcoming reviews, and notebook progress.
- Rich-text formatting with keyboard shortcuts; card content remains stored as Markdown.
- Light and dark themes.
- Automatic local library persistence using SQLite.
- One portable backup and restore format: .memz project archives.
- Native Open and Save dialogs.
- Custom desktop titlebar and window controls.

## Projects, local storage, and backups

MemoMaster separates automatic local persistence from portable project files:

- **SQLite — working copy:** The active library is saved automatically in the operating system's application-data directory. Changes are restored when MemoMaster is reopened. No manual save is needed for ordinary editing.
- **.memz — portable snapshot:** Export or save the complete project to a .memz file. It contains all notebooks, chapters, topics, flashcards, FSRS state, and study history. Keep this file separately to back up your work or move it to another computer.

The two formats contain the same project data and work together:

- Saving/exporting a project creates a snapshot from the current library in SQLite-backed app state.
- Opening a .memz file replaces the active library; the imported contents are then automatically saved to SQLite.
- Starting a new project replaces the active library with an empty one and clears the remembered .memz save path. The empty project is also saved automatically.
- Reopening MemoMaster restores the latest local working copy from SQLite. It does not automatically restore an older .memz snapshot.

A .memz file is not updated when you continue editing after exporting it. Save/export again to refresh that backup. Keep backups outside the application-data directory; a local SQLite database is not a substitute for an independent backup.

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
- Anki import/export, cloud sync, and multi-device synchronization are future work.
- FSRS scheduling and review history are stored with notebook/card data and included in .memz backups.
- Preserve backward compatibility with supported .memz archive versions when changing the archive format.
