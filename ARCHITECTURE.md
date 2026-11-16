# MemoMaster Architecture

## Product shape

MemoMaster is a desktop-first learning and revision application. Its content hierarchy is Library → Notebook → Chapter → Topic → Flashcard. Each flashcard has Markdown front and back content. Cards belong to a notebook and can optionally reference a chapter and topic. Notebook view has two tabs: Browse and Study. Browse provides a searchable card list, chapter/topic filters, and a selected-card preview. Study supports Scheduled and Unscheduled sessions over a notebook, chapter, or topic. Scheduled reviews use FSRS-6; the review UI exposes three choices: Forgot (Again), Difficult (Hard), and Easy (Easy). Unscheduled practice records activity separately and must not mutate FSRS state or due dates. A new installation starts with an empty library; no sample notebooks are seeded.

## Technology and runtime

- Tauri 2 creates the native desktop window and exposes native commands.
- Rust owns local persistence and native file access.
- SQLite stores the active library as a JSON document in a single-row table. The Rust command validates JSON syntax and commits the serialized library.
- Preact and JavaScript implement the UI and application state.
- Vite builds and serves the frontend on port 1420.
- Tailwind CSS v4 is integrated through the Vite plugin.
- Tiptap provides the structured rich-text editor; its Markdown extension loads and serializes card content.
- The Tauri dialog plugin provides native Open and Save dialogs.

The app is local-first. Google Fonts are currently imported from the network in src/styles/index.css; bundle fonts locally if fully offline typography becomes a requirement.

## State and persistence

Layout.jsx owns the active Preact state: notebook collection, active view, active notebook ID, library query, dialogs/notices, theme, and remembered project path.

On startup, Rust opens the SQLite database in Tauri's application-data directory. load_library returns the saved library JSON if one exists. If the database is empty, the frontend starts with an empty library. The frontend debounces state changes and calls save_library. When the native window is closed, the latest state is saved before the window is destroyed.

The database contains an app_state table with one row for the current library. The library is serialized as JSON to keep the initial persistence layer small while the notebook schema is still evolving. This is a deliberate first persistence step. FSRS scheduling state is stored on each card; scheduled review history (`reviewHistory`) and unscheduled practice history (`practiceHistory`) are stored on the notebook as part of the same JSON library document.

Theme selection and the last-used .memz save path remain in localStorage. The path only supports the Save project convenience action; the SQLite library is what restores the active project on relaunch.

## Project lifecycle and portable backup

### SQLite working copy

SQLite is the automatic local working copy. Notebook, chapter, topic, and card edits are debounced to save_library and are restored on the next launch. Creating a new project writes an empty library to this same storage, replacing the previous working copy.

### Project archive: .memz

A ZIP archive containing:
- manifest.json: format identifier, archive version, and notebook IDs.
- notebooks/{notebookId}/notebook.json: notebook metadata, hierarchy, scheduled review history, and unscheduled practice history.
- notebooks/{notebookId}/cards/{cardId}.json: individual card records, including FSRS scheduling state.

The importer validates the manifest, IDs, ZIP directory entries, decompressed sizes, and CRC checksums. Version 1 archives remain supported through a legacy Markdown-card migration path; version 2 stores JSON card records.

The File menu exposes these project actions:
- **New project:** asks for confirmation, replaces the active library with an empty one, clears the remembered .memz path, and lets SQLite autosave the empty state. It does not delete an existing .memz backup.
- **Open project:** reads a selected .memz archive and replaces the active library. The imported project is then saved to SQLite.
- **Save project:** writes a snapshot to the remembered .memz path. If there is no remembered path, it opens Save As.
- **Save project as:** asks for a destination and writes a .memz snapshot there.

A .memz archive is a portable snapshot, not a live link to the SQLite database. Later edits do not change an earlier archive; save/export again to refresh it. Opening a .memz and loading SQLite are compatible because both represent the same library data. The .memz format is the only supported manual backup/restore format; individual notebook files are not supported.

## Native commands

- load_library: read the saved library JSON from SQLite.
- save_library: validate JSON and upsert the library row.
- read_project_file: read bytes from a path selected by the native dialog.
- write_project_file: write bytes to a path selected by the native dialog.

The dialog plugin is enabled in the default desktop capability. Native file operations are kept behind Rust commands rather than using browser file inputs or browser downloads.

## Markdown rendering

RichTextEditor.jsx uses Tiptap StarterKit and its Markdown extension. Front and back content remain Markdown strings. markdown.js renders saved Markdown in read-only study mode and escapes HTML-sensitive source text.

The Tiptap Markdown extension is currently documented as beta. Keep Markdown as the persisted interchange format and test parse/serialize round trips before enabling additional node types.

## Current data model

A notebook contains id, title, color, chapters, flashcards, reviewHistory, and a cached cards count. Each card contains id, front, back, chapterId, topicId, and an optional fsrs record. The fsrs record follows ts-fsrs Card fields (due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, and last_review). Review history records each review's rating, card ID, and FSRS log fields. Keep cards synchronized when the card collection changes.

`src/services/fsrs.js` wraps `ts-fsrs` and converts persisted ISO date strings to/from Date objects. `NotebookView.jsx` owns Browse filters/preview and Study mode/scope selection. `ReviewSession.jsx` builds a queue for the selected scope; scheduled sessions preview intervals and update FSRS state, while unscheduled sessions only append to `practiceHistory`. `StudyStatus.jsx` derives the yearly activity heatmap, streaks, review outcomes, upcoming due counts, recall rate, and notebook progress from saved review history and card state. These reports are local calculations; no analytics are sent externally.

## Planned boundaries (not implemented)

- Media attachments and richer card templates.
- Anki import/export and optional synchronization.
- Normalized SQLite tables and schema migrations as the domain model stabilizes.

## Data flow

Preact components → Layout state and serialization services → Tauri IPC commands → Rust native commands → SQLite and user-selected .memz files.
