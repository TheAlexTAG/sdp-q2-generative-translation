# Web Client (React + Vite)

This is the demo UI for the project and the home of the TypeScript auto-translation logic.

It talks to the backend through the Vite dev proxy (`/api/*`).

Full system doc: `../../docs/SYSTEM.md`.

---

## Run (dev)

From repo root:

```bash
pnpm --filter web dev
```

---

## Vite Proxy

`apps/web/vite.config.ts` proxies:

- `/api/*` → `http://127.0.0.1:8001/*` (FastAPI backend)

This keeps browser requests same-origin during development.

---

## Auto Translation (How it works)

The auto-translator is installed globally in `apps/web/src/App.tsx` and is re-installed when:

- the route changes (`location.pathname`)
- the target language changes

### DOM detection

`apps/web/src/auto-translator/domTextObserver.ts` uses a `MutationObserver` to detect:

- added nodes (`childList`)
- text changes (`characterData`)
- placeholder changes (`attributes: ["placeholder"]`)

Filtering rules:

- Only translates content under `<main>`.
- Ignores `header`, `nav`, `footer`.
- Supports opting out with `[data-no-translate]`.

### Batching + priority

`apps/web/src/auto-translator/installAutoTranslator.ts` builds a priority scheduler and sends requests via:

- `apps/web/src/auto-translator/translationClient.ts` → `POST /api/translate_batch`

Important behavior:

- De-duplicates by exact text: if the same text appears in multiple nodes, it sends one request and updates all nodes.
- Priority classes:
  - `critical`: headings (`h1/h2/h3`)
  - `normal`: in-viewport elements
  - `background`: offscreen elements
- Batch sizes:
  - `critical`: 6
  - `normal`: 4
  - `background`: 2
- Timing:
  - `critical` flushes immediately
  - others flush after `flushDelayMs` (default `300ms`)

Each batch item includes `priority`, so the backend can schedule requests properly.

### Priority classification (detailed)

The auto-translator classifies each detected UI string into a priority bucket:

- `critical`: headings (`h1/h2/h3`) or text inside them
- `normal`: element currently in the viewport
- `background`: everything else (offscreen)

Mechanically:

1. Determine the target element:
   - Text nodes: the node’s `parentElement`
   - Placeholders: the `<input>`/`<textarea>` itself
2. If the target is (or is inside) `h1/h2/h3` → `critical`
3. Else if `getBoundingClientRect()` intersects the viewport → `normal`
4. Else → `background`

---

## Caching (frontend)

The frontend keeps a per-install memory cache inside `installAutoTranslator()` to avoid repeatedly translating the same exact string during one page/language session.

The backend also caches translations (LRU+TTL); see `apps/llm/README.md` and `docs/SYSTEM.md`.

---

## “LLM translating…” indicator

`apps/web/src/llmActivity.tsx` tracks in-flight calls via `llm.run(...)`.

- It shows the busy pill while requests are in flight.
- It holds the “busy” state for ~400ms after the last request to avoid flicker between batches.

---

## Health / Status

`apps/web/src/components/ConnectionStatus/ConnectionStatus.tsx` polls every 10s:

- `/api/health` (backend)
- `/api/health/llama` (llama-server reachability)
