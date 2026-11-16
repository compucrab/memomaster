# MemoMaster Architecture

## Product shape

MemoMaster is a desktop-first learning and revision application. Its intended content hierarchy is:

```text
Library
└── Notebook
    └── Chapter
        └── Topic
            └── Flashcard
                ├── Front (Markdown)
                └── Back (Markdown)
```

Cards currently belong to a notebook and can optionally reference a chapter and topic. A topic belongs to a chapter. The UI is designed around studying one card at a time rather than presenting cards as a long editable list.

## Technology and runtime

- **Tauri 2** creates the native desktop window and provides native window APIs.
- **Rust** is the native application entry point. At present, `src-tauri/src/lib.rs` registers the Tauri opener plugin and starts the application; there are no application-specific commands or database operations yet.
- **Preact + JavaScript** implement the UI and current application state.
- **Vite** builds and serves the frontend on port `1420`.
- **Tailwind CSS v4** is integrated through the Vite plugin. Component-specific styles live in `src/styles`.
- **lucide-preact** supplies interface icons.
- **Tiptap** provides the structured rich-text editing surface; its Markdown extension loads and serializes the existing card content.

The runtime is local-first and does not require a network service for its core UI. Google Fonts are currently imported from the network in `src/styles/index.css`; if fully offline typography becomes a requirement, bundle those fonts locally.

## Source layout

```text
src/
├── App.jsx                  # Root component
├── main.jsx                 # Preact mount and global stylesheet entry
├── components/
│   ├── Layout.jsx           # App shell, view selection, state, import/export
│   ├── Titlebar.jsx         # Tauri titlebar and window controls
│   ├── AppMenu.jsx          # File/Edit application menus
│   ├── Topbar.jsx           # Library search and create action
│   ├── NotebookGrid.jsx     # Notebook library
│   ├── NotebookView.jsx     # Single-card study flow and hierarchy editing
│   ├── Flashcard.jsx        # Card display and card editor composition
│   ├── RichTextEditor.jsx   # Tiptap WYSIWYG Markdown editor
│   ├── ContextMenu.jsx      # Notebook context menu
│   ├── TextPrompt.jsx       # Reusable custom text prompt
│   └── SettingsPanel.jsx    # Theme preferences
├── data/
│   └── notebooks.js         # Development/sample notebook data
├── services/
│   ├── markdown.js          # Small safe Markdown-to-HTML renderer
│   └── projectArchive.js    # .memz ZIP import/export
└── styles/
    ├── index.css            # Global stylesheet imports
    ├── reset.css            # Reset and shared browser styling
    ├── theme.css            # Light theme tokens
    ├── dark-theme.css       # Dark theme overrides
    ├── layout.css           # App shell and workspace layout
    ├── titlebar.css         # Native titlebar presentation
    ├── app-menu.css         # Application menu
    ├── topbar.css           # Library topbar
    ├── notebooks.css        # Notebook library and detail styles
    ├── flashcards.css       # Study and card editor styles
    ├── context-menu.css     # Notebook context menu
    ├── settings.css         # Preferences
    └── overlays.css         # Prompts and notices

src-tauri/
├── capabilities/default.json
├── icons/
├── src/lib.rs               # Tauri builder
├── src/main.rs              # Native entry point
├── build.rs
├── Cargo.toml
└── tauri.conf.json
```

## UI and state ownership

`Layout.jsx` is the current application coordinator. It owns the in-memory notebook collection, active view, active notebook ID, library query, context-menu/prompt/notice state, and selected theme.

It passes data and callbacks down to focused components. Keep child components presentational where practical: they should report user intent through callbacks rather than reaching into global state.

Current state lifecycle:

1. `initialNotebooks` seeds the library when the app starts.
2. UI edits update the Preact state in `Layout`.
3. Theme preference is written to `localStorage`.
4. Notebook content is not yet written to a durable database. Restarting the app resets it to the sample data.
5. Export serializes the current in-memory library into a `.memz` archive; import reads an archive and merges its notebooks into the current state.

## Current data model

A notebook currently has this general shape:

```js
{
  id: "rust",
  title: "Rust Programming",
  description: "A short description",
  color: "#477dbb",
  chapters: [
    {
      id: "rust-basics",
      name: "Rust fundamentals",
      topics: [
        { id: "rust-ownership", name: "Ownership" }
      ]
    }
  ],
  cards: 1,
  flashcards: [
    {
      id: "ownership-card",
      front: "## What is ownership?",
      back: "A set of rules...",
      chapterId: "rust-basics",
      topicId: "rust-ownership"
    }
  ]
}
```

The `cards` field is currently a cached count used by the library UI and archive metadata; when changing card collections, keep it synchronized. The actual card records live in `flashcards`.

IDs are stable strings. Newly created records use `crypto.randomUUID()`. Existing sample IDs are readable for development.

## Markdown rendering

`components/RichTextEditor.jsx` uses Tiptap StarterKit and its Markdown extension to present formatted content while storing card front/back as Markdown strings. The toolbar exposes common formatting, while keyboard shortcuts are provided by the editor engine. `services/markdown.js` renders saved Markdown in the read-only study view; it escapes HTML-sensitive characters and supports headings (levels 1–3), paragraphs, unordered and ordered lists, blockquotes, bold, italics, strikethrough, inline code, fenced code blocks, horizontal rules, and HTTP(S) links.

The Tiptap Markdown extension is currently documented as beta. Keep Markdown as the persisted interchange format and test parse/serialize round trips before enabling additional node types.

When extending Markdown support:
- Escape source text before generating markup.
- Do not interpolate untrusted raw HTML.
- Add focused tests for parsing and escaping before adding complex syntax.
- Consider a maintained Markdown parser and sanitizer if the supported syntax grows substantially.

## Project archive format

`services/projectArchive.js` owns the portable `.memz` format. It writes a ZIP archive containing:
- `manifest.json`: format identifier, archive version, and notebook IDs.
- `notebooks/{notebookId}/notebook.json`: notebook metadata and hierarchy.
- `notebooks/{notebookId}/cards/{cardId}.json`: individual card data.

The importer validates the manifest, IDs, ZIP directory entries, decompressed sizes, and CRC checksums. Version 1 archives are still accepted through a legacy Markdown-card migration path; version 2 stores JSON card records. Preserve old-version import support when evolving the format. Bump the manifest version when making incompatible format changes and keep migration logic explicit.

## Native permissions and window

The app uses a custom undecorated window. `Titlebar.jsx` calls Tauri's window API for dragging, minimizing, maximizing, restoring, and closing. The default capability grants only the window permissions currently required plus the opener plugin defaults.

Keep native permissions narrow. Add a capability only when a concrete feature requires it.

## Planned boundaries (not implemented)

These are product direction, not current code:
- SQLite-backed durable local storage.
- Rust-owned data validation and persistence commands.
- FSRS scheduling and review logs.
- Separate scheduled-study and free-review flows.
- Media attachments and richer card templates.
- Anki import/export and optional synchronization.

A future persistence design should establish a clear boundary: Preact expresses user actions; Rust validates and executes domain operations; SQLite stores canonical data. Avoid making the frontend and Rust independently authoritative for the same data.

## Data flow target

```text
Preact components
      │ user intent / view state
      ▼
Application state and service boundary
      │ command payloads (runtime-validated)
      ▼
Tauri IPC commands (Rust)
      │ domain validation and transactions
      ▼
SQLite
```

This is the intended direction for durable storage, not the current implementation. The present archive and Markdown services remain frontend JavaScript modules.
