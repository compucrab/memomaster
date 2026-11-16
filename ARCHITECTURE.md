# MemoMaster Architecture

## Product model

MemoMaster is a desktop-first, local-first learning and revision app. The content hierarchy is:

**Library → Notebook → Chapter → Flashcard**

A notebook contains chapters, flashcards, scheduled review history, and unscheduled practice history. A card contains Markdown front/back content, an optional chapterId, and optional FSRS state. Topics are no longer part of the product model; legacy topic metadata is stripped when old library or archive data is loaded.

Notebook view has two tabs:

- **Browse:** searchable card list with each card's next due date/time, chapter filter, card preview with next-review information, edit action, multi-selection, bulk deletion, chapter reassignment, and schedule reset.
- **Study:** Scheduled or Unscheduled sessions scoped to a whole notebook or one chapter.

A new installation starts with an empty library.

## Technology and runtime

- Tauri 2 provides the native desktop window and IPC boundary.
- Rust owns SQLite access, native file reads/writes, and automatic backup file creation.
- Preact and JavaScript own the UI and in-memory application state.
- Vite serves the frontend on port 1420 and builds the production assets.
- Tailwind CSS v4 and project styles provide the UI.
- Tiptap and its Markdown extension power the card editor.
- KaTeX renders inline and display mathematics.
- ts-fsrs implements FSRS-6 scheduling.
- The Tauri dialog plugin provides native file selection.

## State ownership and persistence

Layout.jsx owns the notebook collection, active view, active notebook, library search, theme, prompts/notices, and remembered project path. Notebook-local browsing, editing, study scope, and review-session state live in their respective components.

On startup, Rust opens memomaster.sqlite3 in Tauri's application-data directory. The app_state table stores the complete library JSON in one row. The frontend loads this value with load_library, normalizes legacy topic fields, and debounces changes through save_library.

The full library JSON approach is intentional for the current small local data model. Normalized SQLite domain tables and explicit database migrations are future work.

Theme and remembered .memz path are stored in localStorage. SQLite is the working copy restored on launch.

## Project archives and backups

The portable .memz format is a ZIP archive generated and parsed by src/services/projectArchive.js.

- manifest.json contains the format identifier, archive version, and notebook IDs.
- notebooks/{notebookId}/notebook.json contains notebook metadata, chapters, and study histories.
- notebooks/{notebookId}/cards/{cardId}.json contains individual cards, including FSRS state.

Version 2 stores JSON card records. Version 1 import remains supported through a legacy Markdown-card migration. The importer validates the manifest, identifiers, ZIP paths, decompressed size limits, compression methods, and CRC checksums. Keep these checks when changing archive handling.

The File menu provides:

- **New project:** replaces the active library with an empty one and clears the remembered project path. Existing archive files are not deleted.
- **Open project:** imports a .memz archive and associates that path with Save project.
- **Save project:** overwrites the associated archive. If no path is associated, it creates a timestamped backup in the application-data backups directory.
- **Preferences:** changes the light/dark theme.

On a successful window close, Layout first saves the latest library to SQLite, creates a .memz snapshot, writes it to the application-data backups directory, and then destroys the window. Backups are timestamped; there is currently no automatic retention or pruning policy.

A .memz archive is a snapshot. It does not stay synchronized with subsequent SQLite edits.

## Scheduled and unscheduled study

src/services/fsrs.js wraps ts-fsrs, converts persisted ISO date strings to Date objects, calculates the four rating intervals, and serializes updated scheduler dates.

Scheduled ratings map to FSRS as follows:

| UI choice | FSRS rating | Session behaviour |
| --- | --- | --- |
| Forgot | Again | Requeue the card |
| Difficult | Hard | Requeue the card |
| Good | Good | Complete the card |
| Easy | Easy | Complete the card |

The review session keeps a local snapshot of its cards so a card remains available after its due date changes during the session. Scheduled reviews update the card's fsrs record and append a log to notebook reviewHistory.

Unscheduled practice can include any cards in scope. Repeat moves a card to the end of the current queue; Done records an entry in practiceHistory. Unscheduled practice must not mutate FSRS state or due dates.

The Study Status dashboard derives activity, streaks, scheduled review outcomes, recall rate, upcoming due counts, and notebook progress from persisted card state and history. Its activity heatmap includes scheduled reviews and unscheduled practice; FSRS outcome and recall calculations use scheduled review history only.

## Card editor and content formats

src/components/CardEditor.jsx provides separate Question and Answer tabs. Each tab mounts its own RichTextEditor instance, so undo/redo history is isolated per side.

Card content remains Markdown for SQLite and .memz portability. Supported content includes:

- Standard Markdown formatting and links.
- Inline images embedded as data URLs. Image title metadata stores width and alignment.
- Inline and display LaTeX mathematics, rendered with KaTeX.
- Video blocks stored as @[video](URL) and converted to provider-specific embeds at render time.
- Text alignment serialized through paragraph/heading HTML attributes.

Image insertion supports file selection and clipboard paste. Inserted images are limited to 12 MB. Video playback is subject to provider restrictions; the app cannot force third-party sites to allow embedding in the desktop webview.

src/services/markdown.js renders saved Markdown for card previews and review sessions. It escapes user-authored text and validates media URL schemes before generating media HTML. Keep renderer changes security-reviewed and cover hostile input.

## Important modules

| Module | Responsibility |
| --- | --- |
| Layout.jsx | Application state, SQLite persistence, project lifecycle, automatic backups |
| NotebookView.jsx | Browse, card selection, chapter operations, study setup |
| CardEditor.jsx | Card metadata, Question/Answer tabs, duplicate warning, schedule reset |
| RichTextEditor.jsx | Tiptap setup, formatting toolbar, media/math insertion, editor history |
| ReviewSession.jsx | Scheduled and unscheduled review queues |
| StudyStatus.jsx | Derived learning activity and review statistics |
| projectArchive.js | .memz ZIP export/import and legacy migration |
| fsrs.js | FSRS scheduling and interval calculation |
| markdown.js | Safe read-only Markdown/media rendering |
| lib.rs | SQLite commands, native file I/O, automatic backup writing |

## Data flow

Preact components → Layout state → frontend services/serialization → Tauri IPC → Rust commands → SQLite or user-data files.
