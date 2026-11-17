# MemoMaster Architecture

## Product model

MemoMaster is a desktop-first, local-first learning and revision app. The content hierarchy is:

**Library → Notebook → Chapter → Flashcard**

A notebook contains chapters, flashcards, scheduled review history, and unscheduled practice history. The library displays each notebook’s New, Learning/Relearning, and Review cards remaining in the current study day, using the configured rollover hour. A card contains Tiptap JSON front/back documents, an optional `chapterId`, and optional FSRS state. Topics are no longer part of the product model; legacy topic metadata is stripped when old library or archive data is loaded.

Notebook view has two tabs:

- **Browse:** searchable card list with next due date/time, chapter filter, preview, editing, multi-selection, bulk deletion, chapter reassignment, and schedule reset.
- **Study:** Scheduled review or unscheduled practice scoped to a whole notebook or one chapter.

A new installation starts with an empty library.

## Technology and runtime

- Tauri 2 provides the native desktop window and IPC boundary.
- Rust owns SQLite access, native file reads/writes, and automatic backup file creation.
- Preact and JavaScript own the UI and in-memory application state.
- Vite serves the frontend on port 1420 and builds the production assets.
- Tailwind CSS v4 and project styles provide the UI.
- Tiptap and its Markdown extension power the card editor.
- KaTeX renders inline and display mathematics.
- ts-fsrs 5.4.2 implements FSRS-6 scheduling.
- The Tauri dialog plugin provides native file selection.

## State ownership and persistence

Layout.jsx owns the notebook collection, active view, active notebook, library search, theme, FSRS preferences, prompts/notices, and remembered project path. Notebook-local browsing, editing, study scope, and review-session state live in their respective components.

On startup, Rust opens `memomaster.sqlite3` in Tauri's application-data directory. The `app_state` table stores the complete library JSON in one row. The frontend loads this value with `load_library`, normalizes legacy topic fields, and debounces changes through `save_library`.

The full library JSON approach is intentional for the current small local data model. Normalized SQLite domain tables and explicit database migrations are future work.

Theme, FSRS preferences, and remembered .memz path are stored in localStorage. FSRS preferences are app-wide and shared by all notebooks in this iteration. They are not embedded in .memz archives; per-notebook presets are a later iteration. SQLite is the working copy restored on launch.

## Project archives and backups

The portable .memz format is a ZIP archive generated and parsed by `src/services/projectArchive.js`.

- `manifest.json` contains the format identifier, archive version, and notebook IDs.
- `notebooks/{notebookId}/notebook.json` contains notebook metadata, chapters, and study histories.
- `notebooks/{notebookId}/cards/{cardId}.json` contains individual cards, including FSRS state.

Version 3 stores JSON card records whose `front` and `back` fields are canonical Tiptap documents. Version 1 and 2 archives remain importable; legacy Markdown content is converted to Tiptap JSON when the library is normalized. The importer validates the manifest, identifiers, ZIP paths, decompressed size limits, compression methods, and CRC checksums. Keep these checks when changing archive handling.

The File menu provides:

- **New project:** replaces the active library with an empty one and clears the remembered project path. Existing archive files are not deleted.
- **Open project:** imports a .memz archive and associates that path with Save project.
- **Save project:** overwrites the associated archive. If no path is associated, it creates a timestamped backup in the application-data backups directory.
- **Preferences:** changes the light/dark theme and FSRS scheduling preferences.

On a successful window close, Layout first saves the latest library to SQLite, creates a .memz snapshot, writes it to the application-data backups directory, and then destroys the window. Backups are timestamped; there is currently no automatic retention or pruning policy.

A .memz archive is a snapshot. It does not stay synchronized with subsequent SQLite edits.

## Scheduled and unscheduled study

`src/services/fsrs.js` wraps the ts-fsrs v5 API, converts persisted ISO date strings to Date objects, calculates the four rating intervals, applies the study-day rollover, and serializes updated scheduler dates.

Default scheduling preferences:

| Setting | Default |
| --- | --- |
| Desired retention | 0.90 |
| Learning steps | `1m`, `10m` |
| Relearning steps | `10m` |
| Maximum interval | 180 days |
| Study-day rollover | 04:00 local time |

The scheduler uses deterministic intervals (`enable_fuzz: false`) so the interval shown before a rating matches the due date saved after that rating. Existing due dates are not rescheduled when preferences change; the new preferences apply on subsequent reviews. Each scheduled review log also stores the exact pre-review and post-review FSRS snapshots, state, stability, and difficulty. These snapshots preserve the complete transition for analytics and optimizer export.

Scheduled ratings map to FSRS as follows:

| UI choice | FSRS rating | Scheduling behaviour |
| --- | --- | --- |
| Again | Again | Failed recall. FSRS schedules a learning or relearning step. |
| Hard | Hard | Successful recall with significant effort. |
| Good | Good | Successful recall. |
| Easy | Easy | Successful recall with high confidence. |

The library daily counts include all new cards and learning/relearning or review cards due before the next study-day rollover. The active review queue starts with new cards, due cards, and learning/relearning cards due within the next 10 minutes. After a rating is saved, any card whose next interval is 10 minutes or less is immediately appended to the queue; it is not held until its timestamp. Cards with longer intervals leave the active queue and become available when due later. The queue is continuous and can grow or shrink as cards are rescheduled, so the review screen does not display a progress bar or completion percentage. After revealing an answer, the review screen keeps the question above the answer with a horizontal divider and expands the card to the available workspace. Leaving review preserves all saved FSRS state and history.

Unscheduled practice can include any cards in scope. Repeat moves a card to the end of the current queue; Done records an entry in `practiceHistory`. Unscheduled practice must not mutate FSRS state or due dates.

### Study-day rollover

FSRS v5 measures elapsed time in fixed 24-hour blocks. MemoMaster normalizes scheduler timestamps to local study-day boundaries using the configured rollover hour before calculating elapsed review days, then converts review due dates back to local rollover boundaries. Learning/relearning steps retain their exact minute-based timing. The same rollover hour is used for daily workload grouping.

## Study activity and streaks

`StudyStatus.jsx` is a concise activity dashboard. Its GitHub-style consistency graph is built from persisted `studySessions` records. A record is created only when a scheduled review queue is fully completed for a whole notebook or one chapter; exiting early, reviewing only part of the queue, and unscheduled practice do not create activity or extend a streak.

Each completion record stores the completion timestamp, scope, chapter ID when applicable, and number of cards reviewed. Records live on the notebook and are included in SQLite saves and .memz project metadata. The configured study-day rollover is applied when grouping activity into days.

The dashboard shows current and longest completed-day streaks, total completed study days, cards reviewed in completed sessions, a calendar-aligned 12-month consistency graph, and the number of new or due cards across the library. The Needs attention list ranks notebooks and chapters by overdue, due, and new cards, and shows the last completed study date for each area. The current streak remains active during the current study day if the previous study day was completed. Longest streak is calculated across all retained session records.

Older projects without `studySessions` start with an empty activity history; existing review logs are not retroactively treated as completed notebook or chapter sessions because they cannot establish whether the full queue was completed.

## Card editor and content formats

`src/components/CardEditor.jsx` provides separate Question and Answer tabs. Each tab mounts its own RichTextEditor instance, so undo/redo history is isolated per side.

Card content is stored as Tiptap JSON in SQLite and .memz archives. `src/services/cardDocument.js` normalizes legacy Markdown strings to JSON, renders JSON using the same extension schema as the editor, and resolves notebook media references for display. Browse previews and review sessions use this shared renderer, so editing and previewing use one content model.\n\nThe editor supports five semantic heading levels, emphasis, underline, inline code and code blocks, lists, quotes, links, a fixed text-color palette, editable tables, inline/display LaTeX, images with contextual resize controls, video link cards, and editable info cards for additional notes. Arbitrary text sizing and text alignment controls are not exposed; document content remains left-aligned with a shared typography scale.

Each notebook has a reusable `media` collection. Image files are stored once as media assets in notebook metadata and card JSON stores a `memomedia://{assetId}` reference. The media picker can reuse an image in multiple cards. Media assets are included in SQLite library saves and .memz archives because they are part of notebook metadata. Clipboard image paste also adds the image to the media collection.

Video content is stored as a link card using `@[video](URL)`; previews never embed or autoplay the video. Selecting the card opens the original supported video URL in the user's browser. Info cards are block nodes with a title and editable rich-text body, rendered consistently in the editor and card previews.

`src/services/cardDocument.js` renders canonical Tiptap JSON for browse previews and review sessions. `src/services/markdown.js` remains as the legacy Markdown conversion/renderer path. Keep renderer changes security-reviewed and cover hostile input.

## Important modules

| Module | Responsibility |
| --- | --- |
| Layout.jsx | Application state, SQLite persistence, project lifecycle, automatic backups, FSRS preferences |
| NotebookView.jsx | Browse, card selection, chapter operations, study setup |
| CardEditor.jsx | Card metadata, Question/Answer tabs, duplicate warning, schedule reset |
| RichTextEditor.jsx | Tiptap setup, formatting toolbar, media/math insertion, editor history |
| ReviewSession.jsx | Continuous FSRS review queue, four rating controls, and unscheduled practice queue |
| StudyStatus.jsx | Retention, rating, workload, maturity, and lapse analytics |
| projectArchive.js | .memz ZIP export/import and legacy migration |
| fsrs.js | FSRS scheduling, study-day rollover, interval calculation |
| fsrsSettings.js | Default and validated app-wide FSRS preferences |
| cardDocument.js | Tiptap JSON normalization, media resolution, and shared HTML rendering |\n| editorExtensions.js | Shared Tiptap schema for editing and rendering |\n| markdown.js | Legacy Markdown rendering and conversion support |
| lib.rs | SQLite commands, native file I/O, automatic backup writing |

## Verification

Run the frontend build and FSRS regression tests:

```powershell
npm run build
npm test
```

The test suite covers Again/relearning, Hard semantics, Good/Easy scheduling, preview-versus-saved intervals, retention and maximum-interval configuration, study-day rollover, review snapshots. `fsrsCompatibility.test.js` adds a scheduler-contract matrix for all ratings, late reviews, counters, maximum interval enforcement, and minute-level learning steps. These tests do not yet establish exact Anki parity; shared golden fixtures must still be executed against Anki’s own scheduler.

## Data flow

Preact components → Layout state → frontend services/serialization → Tauri IPC → Rust commands → SQLite or user-data files.
