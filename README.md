# MemoMaster

MemoMaster is a local-first desktop learning and revision app built with Tauri 2, Preact, Vite, and Rust. It organizes material into notebooks, chapters, and flashcards.

## Features

- Notebook library with notebook creation, rename, deletion, and cover-strip colour selection. Each notebook shows New, Learning/Relearning, and Review cards remaining before the next study-day rollover.
- Notebook workspace with Browse and Study tabs.
- Browse cards with question/answer search, chapter filtering, preview, editing, Ctrl/Shift multi-selection, bulk deletion, chapter reassignment, and schedule reset.
- Duplicate-question detection: exact duplicates are blocked and close matches are flagged before saving.
- Rich card editor with separate Question and Answer tabs, powered by Tiptap.
- Canonical Tiptap JSON for card content, with Markdown conversion retained for legacy content and archive imports.
- Notion-style contextual text formatting, five heading levels, lists, quotes, inline code, links, and a native text-colour picker.
- Editable tables with row and column controls; tables remain within the available editor and card width and scroll horizontally when needed.
- Image insertion from files or clipboard, notebook-scoped reusable media, and per-image drag resizing. Images are stored once in the notebook media collection (up to 12 MB per inserted image).
- Inline and display LaTeX equations rendered with KaTeX and edited through a contextual Edit action.
- Video link cards for YouTube, Vimeo, Instagram public posts/reels, Facebook, and direct MP4/WebM/OGG URLs. Cards have editable labels and open the destination in the browser; they do not embed or autoplay video.
- Contextual Edit actions for equations, images, video cards, info cards, and tables. Text selection exposes formatting controls; Ctrl + Space opens the searchable command palette.
- FSRS-6 scheduled reviews and unscheduled practice for a whole notebook or a chapter.
- Anki-style review screen with the question above the revealed answer, separated by a horizontal divider, plus Again/Hard/Good/Easy ratings backed by FSRS-6 and configurable learning/relearning steps.
- Configurable desired retention, learning/relearning steps, maximum interval, and study-day rollover.
- Retention dashboard with actual versus desired retention, monthly trend, rating distribution, daily workload forecast, card maturity, and frequently forgotten cards. Dashboard review metrics count only reviews that schedule the card beyond one day; short learning/relearning repetitions are excluded.
- Light and dark themes.
- Automatic SQLite persistence and automatic .memz backup on application close.
- Portable .memz project open/save support and a custom desktop titlebar.

## Keyboard shortcuts

Shortcuts apply in the relevant notebook, editor, or review screen. Alt-based navigation and card actions are handled even when a text field is focused. Plain B and S are not navigation shortcuts.

| Context | Shortcut | Action |
| --- | --- | --- |
| Notebook | A / Alt + A | Add a card |
| Browse | E / Alt + E | Edit the selected card |
| Notebook | Alt + B / Alt + S | Open Browse / Study |
| Browse | Ctrl-click | Add or remove a card from the selection |
| Browse | Shift-click | Select a continuous range of cards |
| Browse | Ctrl + Shift + click | Add a range to the current selection |
| Browse | Delete | Delete selected cards after confirmation |
| Browse | Escape | Clear selection; with no selection, return to the library |
| Study / Browse | Escape | Return to the library |
| Editor | Ctrl + Enter | Save the card and continue with a new card |
| Editor | Ctrl + D | Open the chapter picker |
| Editor | Ctrl + Space | Open the command palette |
| Editor | Alt + Q / Alt + W | Switch to Question / Answer |
| Editor | Alt + B / Alt + S | Leave the editor for Browse / Study; asks before discarding changes |
| Review | E | Edit the active card and return to Browse |
| Scheduled review | 1 / 2 / 3 / 4 | Again / Hard / Good / Easy |
| Scheduled review | Space | Reveal the answer; when visible, rate Good |\n| Unscheduled practice | 1 | Repeat the revealed card (move it to the end of the queue) |\n| Unscheduled practice | 2 | Reveal the answer; when visible, mark the card Done |\n| Unscheduled practice | Space | Reveal the answer; when visible, mark the card Done |
| Application | Ctrl + , | Open Preferences |
| Application | Ctrl + S | Save project and choose a destination |
| Application | Escape | Return from Help, Preferences, About, or study status to the library |

## FSRS scheduling

The scheduler uses `ts-fsrs` (FSRS-6). Default preferences:

| Setting | Default |
| --- | --- |
| Desired retention | 90% |
| Learning steps | 1 minute, 10 minutes |
| Relearning steps | 10 minutes |
| Maximum interval | 180 days |
| Study-day rollover | 04:00 local time |

Review buttons follow these rules:

- **Again:** failed recall. FSRS schedules a learning or relearning step.
- **Hard:** successful recall with significant effort.
- **Good:** successful recall.
- **Easy:** successful recall with high confidence.

The active review queue includes new cards, due cards, and learning/relearning cards whose next due time is within 10 minutes. After a rating, a card whose next interval is 10 minutes or less is placed at the end of the queue immediately instead of making you wait for its timestamp. Cards scheduled beyond that short-term window leave the active queue and become available when due later. The queue is continuous rather than a fixed batch, so the review screen intentionally has no progress bar or completion percentage.

Changing FSRS preferences affects future scheduling. Existing due dates are not silently recalculated. Review history retains the before-and-after FSRS snapshots for audit and optimizer export. Preferences are shared across notebooks and stored locally in the application webview; they are not currently embedded in .memz archives. Per-notebook presets are a later iteration.

## Local storage and backups

MemoMaster uses two forms of local storage:

- **SQLite working copy:** The active library is saved automatically in the operating system's application-data directory and restored on launch. Ordinary editing does not require a manual save.
- **.memz project archive:** A portable ZIP snapshot containing notebooks, chapters, cards, FSRS state, and study history.

The File menu provides New project, Open project, Save project, and Preferences.

- **New project** replaces the active library with an empty one and clears the remembered project path. It does not delete existing backups.
- **Open project** imports a .memz archive, replaces the active library, and makes that file the remembered Save project destination.
- **Save project** always opens a native save dialog so you can choose the destination and filename. The selected .memz path becomes the remembered project path for the next save dialog.
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
- Card front/back content is stored as Tiptap JSON. Keep Markdown conversion for legacy content and preserve supported .memz archive imports.
