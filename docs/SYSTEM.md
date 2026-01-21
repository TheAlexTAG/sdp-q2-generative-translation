# System Documentation

This project is a fully-local, LLM-based UI translation pipeline:

1. `llama.cpp` runs an OpenAI-compatible HTTP server (`llama-server`).
2. A FastAPI backend (`apps/llm`) exposes a small translation API and forwards requests to `llama-server`.
3. A React/Vite web client (`apps/web`) auto-detects UI text in the DOM, batches it, and calls the backend.

---

## Components and Ports

- **llama.cpp server**: `http://127.0.0.1:7001`
  - Endpoint used: `POST /v1/chat/completions`
  - Health used: `GET /v1/models`
- **FastAPI backend**: `http://127.0.0.1:8001`
  - Public endpoints: `/translate`, `/translate_batch`, `/chat_stream`, `/health`, `/health/llama`
- **Vite dev server (web)**: `http://127.0.0.1:5173` (or Vite’s default)
  - Proxies `/api/*` → `http://127.0.0.1:8001/*` (see `apps/web/vite.config.ts`)

---

## llama.cpp (LLM Server)

The FastAPI backend expects `llama-server` to already be running.

Example (Windows PowerShell):

```powershell
.\llama-server.exe `
  -m "C:\models\llama3\Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf" `
  --port 7001 `
  --ctx-size 4096 `
  --n-gpu-layers 999
```

Notes:

- `--n-gpu-layers 999` means “try to offload as much as possible”; CPU fallback still works.
- This project uses the OpenAI-style interface exposed by llama.cpp.

---

## Backend (FastAPI Translation Service)

Files:

- `apps/llm/main.py`: FastAPI app + endpoints
- `apps/llm/server.py`: llama.cpp client, prompting, queue, cache

### Endpoints

#### `GET /health`
Simple backend health.

#### `GET /health/llama`
Checks whether llama.cpp is reachable by calling `GET http://127.0.0.1:7001/v1/models`.

#### `POST /translate`
Single translation.

Request:

```json
{
  "text": "Hello",
  "src_lang": "auto",
  "tgt_lang": "it",
  "priority": "critical"
}
```

Response:

```json
{ "translation": "Ciao" }
```

#### `POST /translate_batch`
Batch translation (used by the auto-translator).

Request:

```json
{
  "items": [
    { "text": "Title", "src_lang": "auto", "tgt_lang": "it", "priority": "critical" },
    { "text": "Paragraph text…", "src_lang": "auto", "tgt_lang": "it", "priority": "background" }
  ]
}
```

Response:

```json
{ "translations": ["Titolo", "…"] }
```

#### `POST /chat_stream`
Server-Sent Events endpoint that streams tokens from llama.cpp (`stream: true`).

### Priority queue (why short strings can be delayed)

`apps/llm/server.py` runs a **single-worker priority queue** in front of llama.cpp:

- Purpose: prevent the GPU/model from being overloaded by concurrent requests and allow **preemption by priority**.
- Priority classes: `critical`, `normal`, `background`.
- Behavior: the worker always executes the highest priority request available next.

This helps keep headings/UI "snappy" even while long background paragraphs are still translating.

#### Queue deep dive (backend)

Files:

- `apps/llm/server.py` (`_PriorityWorkQueue`, `_QueuedWorkItem`, `translate_with_llm(...)`)

How it works:

- Each translation that actually needs the LLM becomes a queued work item.
- The queue is a priority queue ordered by:
  1. Priority rank (`critical=0`, `normal=1`, `background=2`)
  2. FIFO sequence number (stable ordering within the same priority)
- A single daemon worker thread pulls the next item and executes it (calls llama.cpp).

Important behavior:

- No mid-request preemption: if a long request is currently running, a new `critical` request will run **next**, not immediately.
- Deterministic scheduling: with one worker, "critical before background" is consistent whenever the worker is idle.

### Backend caching

`apps/llm/server.py` also caches translation outputs to avoid repeated work:

- Cache type: **in-memory LRU + TTL**
- Key: `(src_lang, tgt_lang, normalized_text)`
- Stored value: final translated text after cleanup
- Scope: process-local (clears when the backend restarts)

Env vars:

- `TRANSLATION_CACHE_MAX` (default `5000`)
- `TRANSLATION_CACHE_TTL_SECONDS` (default `21600` = 6 hours)

### Prompting and output cleanup

The backend uses a strict “translation-only” prompt and then applies cleanup:

- It strips wrapper markers `<<TEXT_TO_TRANSLATE>> … <<END_TEXT>>`.
- It truncates common “explanation” patterns (to reduce meta output).
- It detects tool-call-looking JSON and re-requests with tools disabled.

### Backend limitations

- **Single worker** means only one llama.cpp call at a time from this backend process.
- Cache is in-memory (no persistence, no cross-machine sharing).
- `max_tokens` is capped in `server.py` (affects very long outputs).

---

## Frontend (React + Auto Translation)

### Vite proxy / API routing

During development, the browser calls `/api/...` and Vite rewrites/proxies to the backend:

- `apps/web/vite.config.ts`
  - `/api/translate_batch` → `http://127.0.0.1:8001/translate_batch`
  - `/api/health` → `http://127.0.0.1:8001/health`
  - `/api/health/llama` → `http://127.0.0.1:8001/health/llama`

### Auto-translation: how text is detected

Files:

- `apps/web/src/auto-translator/domTextObserver.ts`
- `apps/web/src/auto-translator/installAutoTranslator.ts`

Detection uses a `MutationObserver`:

- Observes the full `document.body` for:
  - new nodes (`childList`)
  - text changes (`characterData`)
  - placeholder changes (`attributes: ["placeholder"]`)
- Only translates text inside `<main>`.
- Ignores anything inside `header`, `nav`, `footer`.
- Allows opt-out via `[data-no-translate]`.

### Auto-translation: batching + priority

`installAutoTranslator()` builds a priority scheduler:

- De-duplicates by **exact text** (all DOM nodes with the same text share one translation call).
- Priority heuristics:
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

Each item sent to `/api/translate_batch` includes `priority` so the backend queue can schedule work correctly.

#### Queue deep dive (frontend auto-translation)

Files:

- `apps/web/src/auto-translator/domTextObserver.ts` (detects strings)
- `apps/web/src/auto-translator/installAutoTranslator.ts` (priority queues + batching)
- `apps/web/src/auto-translator/translationClient.ts` (HTTP client)

The auto-translator maintains three in-memory queues:

- `critical`
- `normal`
- `background`

How a string is classified:

1. Pick the "target element":
   - Text node: the text node's `parentElement`
   - Placeholder: the `<input>` / `<textarea>` element
2. `critical` if the target is a heading or inside one:
   - tag is `h1`/`h2`/`h3`, or `el.closest("h1,h2,h3")` is true
3. Else `normal` if the target is in the viewport:
   - `rect.bottom > 0 && rect.top < window.innerHeight`
4. Else `background`

De-duplication (same text in multiple places):

- The scheduler uses the exact text content as the key.
- Multiple nodes with the same key are grouped; one request translates the key, then all waiting nodes are updated.

Batch selection:

- The scheduler always prefers the highest non-empty queue: `critical` → `normal` → `background`.
- Batch size depends on priority:
  - `critical`: 6
  - `normal`: 4
  - `background`: 2
- Within a queue, items are sorted by a simple score (currently text length) so shorter strings tend to go first.

Scheduling / "how often does it send requests?":

- `critical` schedules immediately (0ms).
- `normal` and `background` schedule after `flushDelayMs` (default `300ms`).
- While one batch is running, new items accumulate. When a batch finishes, the next batch is scheduled immediately if more work exists.

Safety (avoid infinite loops):

- When applying translations back into the DOM, the observer is temporarily paused so the mutation doesn’t re-queue the same nodes.

### Frontend caching

The frontend keeps a small in-memory cache in `installAutoTranslator()` to avoid re-requesting the same string during a single install.

Notes:

- It resets when you change route or language (the auto translator is re-installed).
- Backend caching is the durable layer across the whole app runtime.

### “LLM translating…” indicator

`apps/web/src/llmActivity.tsx` provides an activity counter:

- Every network call wrapped via `llm.run(...)` increments `inFlightCount`.
- When the count reaches 0, it keeps “busy” on-screen for ~400ms to prevent flicker between rapid batches.

### Health / status detection in the UI

`apps/web/src/components/ConnectionStatus/ConnectionStatus.tsx` polls:

- `/api/health` (backend)
- `/api/health/llama` (llama.cpp reachability)

Polling interval: 2500ms (2.5 seconds).

---

## Troubleshooting

### Backend says `ConnectionRefusedError` to `127.0.0.1:7001`

- llama.cpp server is not running, wrong port, or blocked by firewall.
- Verify: `curl http://127.0.0.1:7001/v1/models`

### UI translations feel slow for large paragraphs

Common causes:

- Output token count is large (generation time dominates).
- GPU offload is incomplete or the model is running on CPU.
- Your llama-server settings (context size, GPU layers, etc.) are limiting throughput.

What helps:

- Keep “critical” UI strings short (headings/labels).
- Let long paragraphs run in background priority.
- Use backend caching (repeated content becomes fast).
