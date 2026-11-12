# PaperLens

PaperLens is a local-first, privacy-conscious web app/PWA that turns PDFs, scans, and OCR
output into clean, editable documents. Documents are processed and stored on your device by
default. AI assistance is optional, bring-your-own-key, and never required for the core
workflow.

> Status: **Active development — full document reconstruction workspace**. The app imports PDF,
> image, and text files into IndexedDB, runs local OCR with bundled English/Burmese models or
> verified optional packs, offers previewable offline text cleanup, supports source viewing,
> rich-text editing with inline formatting, TXT/HTML/DOCX/PDF (print) export, and backup/restore.
> Selected-text AI actions support multiple provider options, dynamic model discovery, explicit
> key handling, user-configured usage limits, and an opt-in exact-match result cache. A service
> worker and web app manifest make the production build installable and available offline.

## Product rules

- Local-first storage and processing; no mandatory backend or account.
- AI is optional, BYOK, and has no in-app credits or bundled model.
- Non-destructive editing with reviewable transformations.
- Portable static build for GitHub Pages, Vercel, and Cloudflare Pages.
- English is the default language; Burmese is supported from the start.

See [`AGENTS.md`](./AGENTS.md) for engineering rules and [`Prompt.md`](./Prompt.md) for the
product specification.

## Main Features

- **Document library:** Import, list, rename, and delete documents. Local autosave with
  save-state tracking and unsaved-work warnings.
- **Two-panel workspace:** Source and Editor panels side by side with a draggable splitter,
  collapsible left sidebar, and responsive mobile tabs.
- **Source viewer:** PDF.js-powered PDF viewing with page navigation, zoom/pan, fit-to-view,
  hand tool, pinch-to-zoom, and drag-to-select image regions for OCR or focused actions.
- **Rich-text editor:** Tiptap-based editor with bold, italic, underline, strikethrough,
  highlighting, font family/size/color, line spacing, lists, text alignment, links, find and
  replace, and a floating selection toolbar for contextual formatting.
- **OCR:** Tesseract.js-based OCR running in a web worker. Bundled English and Burmese language
  data, optional language pack management in Settings, region OCR, full-image OCR, per-page OCR,
  progress and cancellation.
- **AI Assistant (optional, BYOK):** Chat-style assistant for selected source text or editor
  content. Provider, model, and key management live in Settings — not in the conversation UI.
  Copy, insert, replace/accept, and retry actions. No silent overwrites.
- **Translator:** Side-by-side translation dialog for selected text.
- **Image Refinement Studio:** On-device image enhancement pipeline for improving OCR input
  quality, with presets, before/after preview, and revert.
- **Export:** Plain text (.txt), HTML, Word (.docx), and PDF (print dialog). DOCX export
  preserves headings, formatting, links, lists, quotes, code, and inline text styling.
- **Backup & restore:** Create and restore JSON backups of all local documents and settings.
- **PWA:** Installable offline-capable application with service worker and web app manifest.

## Feature Categories and Detailed Capabilities

### Document import and library

- Supported imports: PDF, PNG, JPEG, WebP, and UTF-8 TXT files (up to 25 MB).
- File type and size validation with actionable error messages.
- Corrupt or unsupported files handled gracefully.
- Documents listed with title, source kind, word count, and last-updated timestamp.
- Rename and delete with confirmation dialogs.
- Local autosave; pending edits are saved on tab close.
- Browser warning if saving is still in progress or failed when navigating away.

### User interface and workspace design

- Two main panels: **Source** (left) and **Editor** (right), starting at equal widths.
- Draggable splitter with enforced minimum widths (30%–70%); user's split preference is
  persisted in localStorage.
- Left navigation sidebar defaults to compact/icon-only state with an accessible
  expand/collapse control and tooltips.
- Mobile view switches between Source and Editor tabs rather than squeezing both panels.
- Top bar and panel toolbars are compact and focused on document tasks.
- Light/dark theme support with system preference detection.

### Source viewer and image handling

- PDF rendering via PDF.js with canvas and text layer.
- Page navigation and page thumbnails within the Source panel.
- Zoom (0.3×–3×), pan, fit-to-view, and hand/drag-to-pan tool.
- Two-finger pinch zoom on touch screens.
- Drag-to-select rectangular image regions for OCR, copy, or download.
- Clear visual selection boundaries with contextual action buttons (OCR region, copy region,
  download region).
- Optional Image Refinement Studio for image sources with enhancement presets.

### Editor and document processing capabilities

- Tiptap rich-text editor with local autosave.
- Inline formatting: bold, italic, underline, strikethrough, text color, highlight color.
- Block formatting: headings (H1/H2), paragraphs, bullet lists, ordered lists, text alignment
  (left/center/right/justify), line spacing (1.0/1.15/1.5/2.0).
- Font family picker (Default, Arial, Georgia, Pyidaungsu, Noto Sans Myanmar, Noto Serif
  Myanmar) and font size control (8–96 px).
- Links: add, edit, remove with validation.
- Find and replace within the editor content.
- Floating selection toolbar appears on text selection with contextual formatting actions.
- Word and character count in editor footer.
- Undo/redo via editor history.
- Non-destructive: AI and transformation results offer accept/reject rather than silently
  overwriting.

### OCR capabilities

- Tesseract.js 7 running in a dedicated web worker (off the UI thread).
- Bundled English (`eng`) and Burmese (`mya`) language data; no upload or account required.
- Optional additional language packs discoverable and installable in Settings with download
  progress, install status, and error handling.
- OCR targets: current PDF page, all PDF pages, full image, or a selected image region.
- Progress indication, cancellation, preview before insert, and insert into editor.
- Multilingual OCR selection when the engine allows it.

### AI features (optional, BYOK)

- AI Assistant presented as a clean chat-style conversation, not a configuration dashboard.
- Provider, model, API key, token, budget, and usage-limit configuration belongs in Settings,
  not in the Assistant UI.
- Direct browser-to-provider requests (no application-server proxy).
- User-supplied API key; keys held in session storage by default, opt-in remember-key stores
  in browser storage.
- Keys and document text are never logged, backed up, or proxied.
- Opt-in exact-match AI result cache stored locally in IndexedDB; bounded by size and expiry.
- Contextual indication of the content being acted on (selected text or source region).
- Assistant responses offer Copy, Insert, Replace/Accept, or Retry; requires intentional user
  action before changing editor content.
- Multiple API keys per provider supported.
- Translator dialog for source-to-target language translation.

### Supported file formats

- Import: PDF (.pdf), PNG (.png), JPEG (.jpg/.jpeg), WebP (.webp), plain text (.txt).
- Export: Plain text (.txt), HTML (.html), Microsoft Word (.docx), PDF (browser print dialog).

### Technology stack

| Concern       | Choice                                                       |
| ------------- | ------------------------------------------------------------ |
| UI            | React 18 + TypeScript (strict)                               |
| Build         | Vite 5                                                       |
| Styling       | CSS Modules + CSS custom properties                          |
| i18n          | i18next + react-i18next (English, Burmese)                   |
| Persistence   | IndexedDB via `idb` and `idb-keyval` (schema-versioned)      |
| Editor        | Tiptap (rich text, local autosave)                           |
| Source viewer | PDF.js (canvas, text layer, regions)                         |
| OCR           | Tesseract.js 7, worker-based, bundled EN/MY + optional packs |
| Image refine  | On-device canvas/worker pipeline (no extra dependency)       |
| AI            | Direct browser-to-provider adapters, BYOK, no proxy          |
| Export        | `docx` library for .docx, browser print for PDF              |
| Tests         | Vitest + Testing Library + jsdom                             |

## Project Architecture

Source code lives under `src/` and is organized by concern:

- `src/app/` — Theme provider, context, error boundary.
- `src/components/` — Shared UI components (Button, Dialog, Form, layout, TopBar).
- `src/domain/` — Core document domain models, paragraph alignment, image refinement.
- `src/features/` — Feature domains: `ai` (Assistant, settings), `editor` (formatting,
  toolbar, find/replace), `image` (refinement dialog), `ocr` (dialog), `translator` (dialog),
  `workspace` (SourcePanel, EditorPanel, region selection).
- `src/hooks/` — Custom React hooks (image gestures, focus mode, theme).
- `src/i18n/` — Translation setup and locale files (English, Burmese).
- `src/lib/` — Shared utilities (file handling, formatting).
- `src/pages/` — Route pages: Library, Workspace, Settings, NotFound.
- `src/services/` — Domain services: AI (providers, keys, usage, cache, prompts),
  export (docx, html, text, print), image (filters, pipeline, refinement), import
  (validation, document import), OCR (engine, language packs, text), settings, storage
  (documents, backup, db, history), PWA (service worker registration).
- `src/styles/` — Base CSS and design tokens.
- `src/test/` — Test utilities and setup.

Build scripts and asset sync live under `scripts/`:
- `sync-ocr-assets.mjs` — Copies Tesseract.js runtime assets (WASM, worker) into
  `public/ocr/`.
- `copy-spa-fallback.mjs` — Copies `dist/index.html` to `dist/404.html` for GitHub Pages
  SPA fallback.

## Installation and Setup

### Prerequisites

- Node.js >= 18.18

### Install dependencies

```bash
npm install
```

Package scripts call Node entry points directly (e.g. `node ./node_modules/vite/bin/vite.js`)
so they do not depend on executable `.bin` shims.

### Start the development server

```bash
npm run dev
```

The app runs on `http://localhost:5173` by default. OCR runtime assets are synced
automatically via the `predev` script.

## Development Commands

| Command                   | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `npm run dev`             | Start development server (port 5173)    |
| `npm run build`           | Type-check and production build         |
| `npm run preview`         | Preview production build locally        |
| `npm run typecheck`       | Run TypeScript type checking            |
| `npm run lint`            | Run ESLint with zero warnings allowed   |
| `npm run lint:fix`        | Auto-fix lint issues                    |
| `npm run format`          | Format code with Prettier               |
| `npm run format:check`    | Check formatting with Prettier          |
| `npm test`                | Run the Vitest test suite               |
| `npm run test:watch`      | Run unit tests in watch mode            |
| `npm run verify`          | Run lint, typecheck, tests, and build   |
| `npm run ocr:assets`      | Sync Tesseract.js runtime assets        |

## Production Build

```bash
npm ci && npm run build
```

This runs TypeScript type-checking, then Vite production build. Output goes to `dist/`.
The `postbuild` step writes `dist/404.html` as the GitHub Pages SPA fallback.

Build output is a static SPA with no required server functions. Chunks larger than 500 kB
produce a warning (not an error); this is expected for the PDF.js and docx bundles.

## GitHub Pages Deployment

The repository is configured for deployment to **PaperLens-v2** on GitHub Pages.

The GitHub Actions workflow (`.github/workflows/pages.yml`) triggers on pushes to the
`main` branch and deploys to GitHub Pages with:

- `VITE_BASE_PATH=/PaperLens-v2/` (matching the repository name for subpath deployment)
- Node.js 20
- `npm ci` and `npm run build`
- `actions/deploy-pages@v4`

The deployed application is served at a subpath (e.g. `https://<user>.github.io/PaperLens-v2/`).
Client-side routing uses `BrowserRouter` with `basename` derived from `BASE_URL`, so the SPA
fallback (`dist/404.html`) is required for direct navigation to deep links.

For manual deployment:

```bash
VITE_BASE_PATH=/PaperLens-v2/ npm run build
```

Then publish the contents of `dist/` to your GitHub Pages site.

### Host-specific notes

- **GitHub Pages:** `VITE_BASE_PATH=/PaperLens-v2/`; postbuild writes `dist/404.html` for
  SPA fallback.
- **Vercel:** `npm ci && npm run build`, output `dist`. `vercel.json` rewrites unknown paths
  to `index.html`.
- **Cloudflare Pages:** `npm ci && npm run build`, output `dist`. `public/_redirects`
  rewrites unknown paths to `index.html`.

Set `VITE_BASE_PATH` at build time whenever the app is not served from the root path `/`.
Service workers require HTTPS (or localhost); test PWA installation against a deployed build
or `npm run preview`.

## Configuration and Environment Variables

| Variable         | Purpose                                      | Default |
| ---------------- | -------------------------------------------- | ------- |
| `VITE_BASE_PATH` | Public base path for subpath deployments     | `/`     |

No API keys or secrets are stored in environment variables. AI provider keys are entered by
the user at runtime and held in session storage by default (opt-in remember-key stores in
browser storage).

## Testing and Quality Assurance

- **Unit tests:** Vitest with Testing Library and jsdom; 38 test files, 230 tests covering
  components, services, exports, OCR, AI, storage, and i18n.
- **Type checking:** `tsc -b` with strict TypeScript.
- **Linting:** ESLint with `--max-warnings=0`.
- **Formatting:** Prettier with 100 print width, 2-space tabs, semicolons, single quotes.

Run the full verification pipeline:

```bash
npm run verify
```

## Known Limitations

- Browser storage (IndexedDB) can be cleared by the browser or user; users should maintain
  backups via the built-in export/backup feature.
- Large documents may affect editor performance; OCR cleanup is chunked with explicit limits
  to reduce latency.
- Service workers require HTTPS (or localhost) for PWA installation.
- DOCX export is the only rich export format; HTML and plain text are also supported.
- PDF export uses the browser's print dialog rather than a server-generated PDF.
- AI is optional and requires a user-provided provider API key; the app is fully usable
  without AI.
- Representative scan-quality OCR testing remains future work.

## Future Development Roadmap

- Continued polish of the two-panel workspace and responsive behavior.
- Additional OCR language packs and improved OCR quality heuristics.
- Enhanced AI assistant capabilities with more contextual actions.
- Additional export formats and template options.

## License

License decision is pending product-owner confirmation. Until then, treat the repository as
all rights reserved.
