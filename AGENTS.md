# Coding Agent Guide

This document is the working contract for coding agents contributing to MemoMaster. Read it together with [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md) before changing code.

## Project constraints

- Build a **desktop application**, not a responsive web product. Do not add mobile navigation or mobile-first layouts.
- Frontend language is **JavaScript** with JSX and Preact. Do not introduce TypeScript, type declarations, or a TypeScript migration.
- Runtime stack: Tauri 2, Preact, Vite, Tailwind CSS v4, Rust, and lucide-preact.
- Keep components directly under `src/components`; do not create component subdirectories unless the project structure is deliberately revised.
- Keep CSS under `src/styles`, split by concern. Do not create a giant global stylesheet or add inline style blocks for ordinary component styling.
- Keep dependencies lean. Do not add a library for a small isolated task without explaining why it is needed.
- Do not add GitHub Actions or other CI workflows unless explicitly requested.
- Do not silently change product behavior, archive compatibility, keyboard shortcuts, or visual conventions while doing cleanup.

## Product model

The intended hierarchy is:

`Notebook → Chapter → Topic → Flashcard`

- A notebook contains chapters and flashcards.
- A chapter contains topics.
- A flashcard has Markdown front and back content.
- A flashcard may be assigned to a chapter and topic.
- A topic assignment must belong to the selected chapter.
- The study interface presents one card at a time.
- Do not turn the study view into a bulk editable card list.
- Keep study/revision logic separate from card editing.

## Current implementation reality

Do not claim or implement against assumptions that are not true:

- Notebook state is currently in Preact memory, seeded by `src/data/notebooks.js`.
- Theme selection is persisted in `localStorage`; notebook data is not.
- The Rust side currently only builds the Tauri application and registers the opener plugin. It does not yet own notebook persistence or scheduling.
- `.memz` import/export is implemented in `src/services/projectArchive.js`.
- Card front/back editing uses Tiptap (`@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/markdown`) through `src/components/RichTextEditor.jsx`; the editor serializes content to Markdown strings.
- `src/services/markdown.js` renders saved Markdown for read-only study mode.
- SQLite, FSRS, Anki import, cloud sync, and durable notebook persistence are not implemented.
- Do not add placeholder Rust commands or pretend that an architectural target already exists.

## UI and interaction rules

- Keep the interface minimal and functional. Avoid taglines, promotional copy, decorative slogans, unnecessary separators, and ornamental elements.
- Do not introduce native browser `alert()`, `confirm()`, or `prompt()`. Use the existing custom prompt/notice patterns.
- Native OS file selection is acceptable for choosing a local project file.
- Notebook strip colour is changed through the notebook's **right-click context menu**. Do not reintroduce a hover-only picker on notebook cards.
- Use the native colour input for colour selection; do not replace it with a hex text field.
- Preserve light and dark themes. Use existing CSS custom properties such as `--paper`, `--surface`, `--ink`, `--muted`, `--line`, `--hover`, and `--accent`.
- Primary actions use the existing blue accent, not green/olive.
- Preserve content scrolling and the themed scrollbar.
- Use lucide-preact icons already in the dependency list.
- Interactive controls need accessible names, visible focus states, and correct button types inside forms.
- Avoid adding controls that look interactive but do not perform a real action.

## Component and state design

- `Layout.jsx` currently coordinates top-level state and view switching. Keep ownership clear; avoid duplicating the same state in multiple components.
- Pass user actions through props/callbacks. Avoid direct mutation of notebook/card objects.
- Use immutable updates for arrays and nested records.
- Keep components focused: UI components render and emit intent; service modules handle reusable non-UI operations.
- Use stable record IDs. Do not use array indexes as persisted IDs.
- When changing cards, keep the notebook's cached `cards` count in sync with `flashcards.length`.
- When changing chapter/topic assignments, prevent a card from retaining a topic that belongs to another chapter.
- Clean up event listeners and effects on unmount.
- Do not use browser APIs unavailable in the Tauri webview without checking platform support and fallback behavior.

## Rust and Tauri

- Keep native window operations in the Tauri layer.
- Add Rust IPC commands only for concrete native/domain responsibilities, not for UI presentation.
- Keep capabilities least-privilege. Add only the permission required by a feature.
- Preserve the undecorated custom titlebar and required window permissions.
- If adding a Tauri plugin, update both Cargo dependencies/registration and the required capabilities, and explain why it is needed.
- Keep `src-tauri/src/main.rs`'s Windows release subsystem attribute.

## Archive and data safety

- Treat imported archives as untrusted input.
- Preserve path traversal checks, entry-count and decompressed-size limits, and CRC validation.
- Validate IDs and required metadata before using imported records.
- Do not remove version 1 migration support without an explicit format migration plan.
- If changing the archive structure, update both import and export paths, document the version change, and preserve old archive compatibility.
- Never silently discard unknown notebook/card fields unless the format contract explicitly requires it.
- Avoid storing derived data as the only source of truth.

## Markdown and HTML safety

- Escape user-authored Markdown before generating HTML.
- Never render user-provided raw HTML directly.
- Any new HTML-producing feature must be reviewed for XSS, including links and URL schemes.
- Keep external links restricted to safe protocols and use appropriate external-window handling for Tauri.
- Add tests for both normal rendering and hostile input when extending the renderer.

## Styling conventions

- Use Tailwind utility classes for straightforward layout and spacing where already established.
- Put reusable and stateful component styling in its corresponding file under `src/styles`.
- Import each active stylesheet exactly once from `src/styles/index.css`.
- Use existing CSS variables for theme-aware colours; avoid hard-coded light-only colours in shared components.
- Check both light and dark themes after visual changes.
- Keep scroll containers compatible with the flex layout: nested flex children that scroll generally need `min-height: 0` and a deliberate `overflow-y` rule.
- Do not add hover-only interactions for essential actions.

## Workflow for changes

1. Inspect the relevant component, its stylesheet, its callers, and any related service before editing.
2. Read the architecture notes when changing data flow, archive structure, or Rust responsibilities.
3. Make the smallest coherent change. Avoid unrelated redesigns or broad rewrites.
4. Search for all references before deleting or renaming a component, stylesheet, function, or field.
5. Update documentation when architecture, commands, data formats, or user-visible behavior changes.
6. Review the final diff for accidental deletions, stale imports, unused props, and unrelated formatting churn.
7. Run the relevant checks locally when possible:
   - `npm run build`
   - `cargo check --manifest-path src-tauri/Cargo.toml`
   - `npm run tauri dev` for desktop-only behavior
8. Report exactly which checks were run and their results. Never claim a build or test passed if it was not executed.

## Avoid

- No TypeScript migration.
- No new framework or state-management library for convenience.
- No cloud account, analytics, telemetry, or network backend without explicit product approval.
- No database, FSRS, sync, or Anki feature presented as complete before it exists.
- No native JS alert/prompt/confirm dialogs.
- No decorative marketing text or UI flourishes.
- No broad file deletion based only on a filename. Verify imports, references, and runtime use first.
