# AGENTS.md

## Commands
- `npm run dev` — start Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build locally
- `npm run lint` — ESLint (JSX only, max-warnings 0)

There is no test suite and no typecheck step in this project.

## Architecture

**Stack:** Vite + React 18 + Tailwind CSS 3 (all JSX, no TypeScript)

**Entry:** `src/main.jsx` → `src/App.jsx`

**Components:** `src/components/`
- `HomePage` — file upload or mic recording UI
- `FileDisplay` — shows selected audio and triggers transcription
- `Transcribing` — loading/progress state
- `Information` — shows final output with transcription + translation tabs
- `Transcription` / `Translation` — tab contents for results

**Web Workers:** `src/utils/`
- `whisper.worker.js` — runs Whisper model via `@xenova/transformers` in a Worker
- `translate.worker.js` — translation worker
- Workers are loaded as ES modules via `new Worker(new URL('./utils/whisper.worker.js', import.meta.url), { type: 'module' })`

**Constants:** `src/utils/presets.js` defines `MessageTypes`, `ModelNames`, and `LANGUAGES`.

## Key behaviors

- **Client-side ML:** The Whisper model runs entirely in the browser. On first use, `@xenova/transformers` downloads the model from Hugging Face (~145MB for `whisper-base`). This happens in a Web Worker so the UI stays responsive.
- **Audio input:** Supports mic recording (MediaRecorder, webm) or file upload (`.mp3`, `.wav`, `.mp4`, `.m4a`, `.webm`, `.ogg`). Audio is resampled to 16kHz mono via Web Audio API before inference. For video files that fail direct `decodeAudioData`, a media-element fallback extracts the audio track.
- **Model:** Uses `openai/whisper-base` (multilingual, supports Arabic + English). The `model_name` is sent from `App.jsx` to the worker.
- **App state flow:** `HomePage` (idle) → `FileDisplay` (audio selected) → `Transcribing` (loading) → `Information` (results). State is lifted to `App.jsx`.
- **No backend:** Fully static SPA. The `public/` dir serves a single `vite.svg`.

## Lint/style notes
- ESLint extends `eslint:recommended`, `plugin:react/recommended`, `plugin:react-hooks/recommended`
- `react-refresh/only-export-components` warns on non-component exports
- Custom Tailwind classes: `.blueShadow`, `.specialBtn`, `.loading` defined in `src/index.css`
- Font Awesome and Google Fonts are loaded from CDN in `index.html` — do not remove those links
