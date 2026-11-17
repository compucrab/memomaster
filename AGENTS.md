# Coding Agent Guide

Read this document together with README.md and ARCHITECTURE.md before changing MemoMaster.

## Project constraints

- Build a desktop application with Tauri 2; do not add mobile navigation.
- Use JavaScript/JSX and Preact. Do not introduce TypeScript without an explicit project decision.
- Runtime stack: Tauri 2, Preact, Vite, Tailwind CSS v4, Rust, and lucide-preact.
- Keep components directly under src/components and styles under src/styles.
- Keep dependencies lean. Explain why a new dependency is needed.
- Do not add GitHub Actions or other CI workflows unless explicitly requested.
- Start new installations with an empty library.
- Do not silently change product behaviour, archive compatibility, keyboard shortcuts, or visual conventions during cleanup.

## Product model and behaviour

The hierarchy is Notebook → Chapter → Flashcard. Topics have been removed; legacy topic fields must not be reintroduced into newly saved library or archive data.

- Cards contain canonical Tiptap JSON front/back documents and may be assigned to a chapter. Markdown remains supported as a legacy input format.
- Notebook view has Browse and Study tabs. Browse supports search, chapter filtering, next-due-date display, preview, editing, multi-selection, bulk deletion, chapter reassignment, and schedule reset.
- Exact duplicate questions are blocked; similar questions warn and allow an explicit Save anyway choice.
- Scheduled review and unscheduled practice can cover a whole notebook or one chapter.
- Scheduled ratings are Again, Hard, Good, and Easy, mapped directly to FSRS ratings. Cards with a next interval of 10 minutes or less immediately return at the end of the active queue; longer intervals leave the queue until due.
- The active review queue is continuous, not a fixed batch. Do not add review progress counters or an undo-last-review action.
- Unscheduled practice can use any card, supports Repeat and Done, records practiceHistory, and must not alter FSRS state or due dates.
- Study status is derived from stored card state and review/practice history. Recall and rating outcomes use scheduled review history only.
- Keep study/revision logic separate from card editing.

## Current implementation

- Layout.jsx coordinates top-level state, theme, view switching, SQLite autosave, project open/save, and close-time backups.
- SQLite stores the active library JSON in one row and restores it on launch.
- .memz is the portable snapshot/restore format. Version 3 exports canonical Tiptap JSON card documents; versions 1 and 2 remain importable. Do not remove those migration paths without an explicit migration plan.
- Opening a .memz replaces the active library and associates the selected path with Save project.
- Save project overwrites the associated archive; with no associated path it creates a timestamped backup in the application-data backups folder.
- A successful application close saves SQLite and creates another timestamped .memz backup in that folder. There is no retention/pruning policy yet.
- Theme, FSRS preferences, and remembered project path are stored in localStorage.
- Tiptap is the canonical card editor and document schema. `cardDocument.js` normalizes legacy Markdown and renders canonical JSON. `markdown.js` remains for legacy conversion/rendering only.
- Images are notebook-scoped media assets referenced by ID from card documents. Preserve width metadata and the drag-resize handle; do not reintroduce alignment controls or duplicate image data in each card.
- Math uses Tiptap Mathematics and KaTeX. Video cards store a validated URL, provider, and editable label; they open in the browser rather than embedding players.
- The editor uses Ctrl + Space for its command palette, text-selection formatting controls, and right-click contextual Edit actions for editable objects. Do not add a permanent formatting toolbar or table zoom/full-screen control.
- Question and Answer editors have separate undo/redo histories.
- Anki import/export, cloud sync, and multi-device sync are not implemented.

## UI and interaction rules

- Keep the interface minimal and functional. Avoid taglines, promotional copy, and decorative flourishes.
- Do not use browser alert(), confirm(), or prompt(); use the existing custom prompt/notice patterns.
- Preserve light and dark themes and the blue accent. Use existing semantic CSS variables.
- Preserve content scrolling and the themed scrollbar.
- Use lucide-preact icons already installed.
- Interactive controls need accessible names, visible focus states, and correct button types.
- Do not add controls that do not perform a real action.
- Use the native colour input for notebook cover colour selection.

## Component and state design

- Keep state ownership clear; avoid duplicating notebook state across components.
- Pass actions through props/callbacks and use immutable updates.
- Use stable IDs for persisted records, never array indexes.
- Keep the cached notebook cards count synchronized with flashcards.length.
- When moving cards, update all selected card chapter assignments together.
- Clean up event listeners and effects on unmount.
- Check Tauri webview API availability before relying on browser features.

## Rust and Tauri

- Keep native window operations and filesystem/database responsibilities in the Tauri layer.
- Add IPC commands only for concrete native responsibilities.
- Keep capabilities least-privilege.
- Preserve the custom undecorated titlebar and required window permissions.
- If adding a Tauri plugin, update Cargo dependencies, plugin registration, and capabilities as needed, and explain why.

## Archive and data safety

- Treat imported archives as untrusted input.
- Preserve path traversal checks, entry-count and decompressed-size limits, and CRC validation.
- Validate IDs and required metadata before using imported records.
- Do not remove version 1 migration support without an explicit migration plan.
- If changing archive structure, update import and export together, document the format change, and preserve old archive compatibility.
- Do not write removed legacy topic fields back into new archives.
- Avoid storing derived data as the only source of truth.

## Markdown and HTML safety

- Escape user-authored Markdown before generating HTML.
- Never render arbitrary user-provided raw HTML directly.
- Review new HTML-producing features for XSS, including links and URL schemes.
- Restrict external links and media to safe protocols.
- Add tests for normal rendering and hostile input when extending the renderer.

## Styling conventions

- Use Tailwind utilities for straightforward layout and spacing.
- Put reusable component styling in its corresponding stylesheet under src/styles.
- Import each active stylesheet exactly once from src/styles/index.css.
- Use theme-aware CSS variables; avoid hard-coded light-only colours in shared components.
- Check both light and dark themes after visual changes.
- Scrollable flex children generally need min-height: 0 and deliberate overflow rules.
- Do not make essential actions hover-only.

## Workflow

1. Inspect the component, stylesheet, callers, and related service before editing.
2. Read architecture notes when changing data flow, archive format, or Rust responsibilities.
3. Make the smallest coherent change; avoid unrelated redesigns.
4. Search all references before deleting or renaming code.
5. Update documentation when architecture, data formats, or visible behaviour changes.
6. Review the diff for accidental deletions, stale imports, unused props, and formatting churn.
7. Run relevant local checks when possible: npm run build, cargo check --manifest-path src-tauri/Cargo.toml, and npm run tauri dev for desktop-only behaviour.
8. Report exactly which checks were run. Never claim an unrun check passed.

## Avoid

- No TypeScript migration or new framework/state library for convenience.
- No cloud backend, analytics, or telemetry without explicit approval.
- Do not describe unimplemented features as complete.
- No browser alert/confirm/prompt dialogs.
- No broad file deletion based only on a filename; verify references and runtime use first.
