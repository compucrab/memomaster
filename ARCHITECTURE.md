# MemoMaster Architecture

## Product model

MemoMaster is a desktop-first, local-first learning and revision app. The content hierarchy is:

**Library → Notebook → Chapter → Flashcard**

A notebook contains chapters, flashcards, scheduled review history, and unscheduled practice history. A card contains Markdown front/back content, an optional `chapterId`, and optional FSRS state. Topics are no longer part of the product model; legacy topic metadata is stripped when old library or archive data is loaded.

Notebook view has two tabs:

- **Browse:** searchable card list with next due date/time, chapter filter, preview, per-card FSRS memory overview, editing, multi-selection, bulk deletion, chapter reassignment, and schedule reset.
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

Version 2 stores JSON card records. Version 1 import remains supported through a legacy Markdown-card migration. The importer validates the manifest, identifiers, ZIP paths, decompressed size limits, compression methods, and CRC checksums. Keep these checks when changing archive handling.

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
| Learning steps | `10m` |
| Relearning steps | `10m` |
| Maximum interval | 36,500 days |
| Study-day rollover | 04:00 local time |

The scheduler uses deterministic intervals (`enable_fuzz: false`) so the interval shown before a rating matches the due date saved after that rating. Existing due dates are not rescheduled when preferences change; the new preferences apply on subsequent reviews.

Scheduled ratings map to FSRS as follows:

| UI choice | FSRS rating | Scheduling behaviour |
| --- | --- | --- |
| Forgot | Again | Failed recall. Enters Learning/Relearning and waits until the configured step is due. |
| Difficult | Hard | Successful recall with effort. Never requeues immediately; if still in a learning state, it returns only when its persisted step becomes due. |
| Good | Good | Advances a learning step or continues the normal review schedule. |
| Easy | Easy | Graduates a learning card or continues the normal review schedule. |

The review session keeps a local snapshot of cards so a card remains available after its due date changes during the session. Cards in Learning/Relearning are held in a pending list and returned to the session only when their saved due timestamp has passed. If the session has no other cards, it displays a waiting state with the next learning-step due time. Exiting does not discard the schedule; the due card will appear in a later session.

Unscheduled practice can include any cards in scope. Repeat moves a card to the end of the current queue; Done records an entry in `practiceHistory`. Unscheduled practice must not mutate FSRS state or due dates.

### Study-day rollover

FSRS v5 measures elapsed time in fixed 24-hour blocks. MemoMaster normalizes scheduler timestamps to local study-day boundaries using the configured rollover hour before calculating elapsed review days, then converts review due dates back to local rollover boundaries. Learning/relearning steps retain their exact minute-based timing. The same rollover hour is used for daily workload grouping.

## Retention and memory analytics

`StudyStatus.jsx` derives its analytics from scheduled review history and current card FSRS state:

- Actual retention: Again is a failure; Hard, Good, and Easy are successful recall.
- Monthly retention trend over the most recent 12 months, compared with the desired-retention target.
- Again/Hard/Good/Easy rating distribution.
- 30-day due workload forecast grouped by study day.
- New, Learning/Relearning, Young, and Mature card breakdown. Mature uses a 21-day-or-longer review interval.
- Frequently forgotten cards ranked by FSRS lapse count.

Browse's `MemoryOverview` shows:

- **Stability:** the FSRS interval at which predicted recall is approximately 90% for FSRS-6.
- **Difficulty:** the model's difficulty estimate on a 1–10 scale.
- **Retrievability:** estimated probability of recall at the current study day.
- **Memory curve:** the FSRS forgetting curve, with a marker for the current position.

These are model estimates, not direct measurements of a person's memory. FSRS parameter optimization from review history is not implemented yet.

## Card editor and content formats

`src/components/CardEditor.jsx` provides separate Question and Answer tabs. Each tab mounts its own RichTextEditor instance, so undo/redo history is isolated per side.

Card content remains Markdown for SQLite and .memz portability. Supported content includes:

- Standard Markdown formatting and links.
- Inline images embedded as data URLs. Image title metadata stores width and alignment.
- Inline and display LaTeX mathematics, rendered with KaTeX.
- Video blocks stored as `@[video](URL)` and converted to provider-specific embeds at render time.
- Text alignment serialized through paragraph/heading HTML attributes.

Image insertion supports file selection and clipboard paste. Inserted images are limited to 12 MB. Video playback is subject to provider restrictions; the app cannot force third-party sites to allow embedding in the desktop webview.

`src/services/markdown.js` renders saved Markdown for card previews and review sessions. It escapes user-authored text and validates media URL schemes before generating media HTML. Keep renderer changes security-reviewed and cover hostile input.

## Important modules

| Module | Responsibility |
| --- | --- |
| Layout.jsx | Application state, SQLite persistence, project lifecycle, automatic backups, FSRS preferences |
| NotebookView.jsx | Browse, card selection, chapter operations, study setup |
| CardEditor.jsx | Card metadata, Question/Answer tabs, duplicate warning, schedule reset |
| RichTextEditor.jsx | Tiptap setup, formatting toolbar, media/math insertion, editor history |
| ReviewSession.jsx | Timed scheduled learning/relearning queue and unscheduled practice queue |
| StudyStatus.jsx | Retention, rating, workload, maturity, and lapse analytics |
| MemoryOverview.jsx | Per-card FSRS memory metrics and forgetting curve |
| projectArchive.js | .memz ZIP export/import and legacy migration |
| fsrs.js | FSRS scheduling, study-day rollover, memory estimates, interval calculation |
| fsrsSettings.js | Default and validated app-wide FSRS preferences |
| markdown.js | Safe read-only Markdown/media rendering |
| lib.rs | SQLite commands, native file I/O, automatic backup writing |

## Verification

Run the frontend build and FSRS regression tests:

```powershell
npm run build
npm test
```

The test suite covers Again/relearning, Hard semantics, Good/Easy graduation, preview-versus-saved intervals, retention and maximum-interval configuration, memory-curve output, and study-day rollover.

## Data flow

Preact components → Layout state → frontend services/serialization → Tauri IPC → Rust commands → SQLite or user-data files.
