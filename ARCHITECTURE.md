# MemoMaster Architecture

## Product shape

MemoMaster is a desktop-first learning and revision application. Its content hierarchy is Library → Notebook → Chapter → Topic → Flashcard. Each flashcard has Markdown front and back content. Cards belong to a notebook and can optionally reference a chapter and topic. The study UI presents one card at a time. A new installation starts with an empty library.

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

Layout.jsx owns the active Preact state: notebook collection, active view, active notebook ID, library query, dialogs/notices, and theme.

On startup, Rust opens the SQLite database in Tauri's application-data directory. load_library returns the saved library JSON if one exists. If the database is empty, the frontend starts with an empty library. The frontend debounces state changes and calls save_library. When the native window is closed, the latest state is saved before the window is destroyed.

The database contains an app_state table with one row for the current library. The library is serialized as JSON to keep the initial persistence layer small while the notebook schema is still evolving. This is a deliberate first persistence step, not the final normalized relational model for future FSRS scheduling and review history.

Theme selection and the last-used project path remain in localStorage.

## Portable backup format

### Project: .memz

A ZIP archive containing:
- manifest.json: format identifier, archive version, and notebook IDs.
- notebooks/{notebookId}/notebook.json: notebook metadata and hierarchy.
- notebooks/{notebookId}/cards/{cardId}.json: individual card records.

The importer validates the manifest, IDs, ZIP directory entries, decompressed sizes, and CRC checksums. Version 1 archives remain supported through a legacy Markdown-card migration path; version 2 stores JSON card records.

Opening a project replaces the active library. Saving a project writes a portable snapshot of the complete library. SQLite remains the active working copy and is autosaved independently. This is the only supported manual backup and restore workflow; individual notebook files are not supported.

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

A notebook contains id, title, color, chapters, flashcards, and a cached cards count. Each card contains id, front, back, chapterId, and topicId. Keep cards synchronized when the card collection changes.

## Planned boundaries (not implemented)

- FSRS scheduling and review logs.
- Separate scheduled-study and free-review flows.
- Media attachments and richer card templates.
- Anki import/export and optional synchronization.
- Normalized SQLite tables and schema migrations as the domain model stabilizes.

## Data flow

Preact components → Layout state and serialization services → Tauri IPC commands → Rust native commands → SQLite and user-selected .memz files.
