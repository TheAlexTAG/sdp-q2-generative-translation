# LLM Translation Module

This module provides a **local, LLM-based translation service** exposed via a REST API.
It is designed for **real-time translation of GUI text** in applications (e.g. React / web UIs),
without relying on external cloud APIs.

The service wraps a locally hosted **LLaMA model** running through `llama.cpp`
and exposes a simple FastAPI interface for single and batch translation.

This module is **LLM-only**.
Traditional MT models (Marian / OPUS / CTranslate2) are intentionally not used here.

---

## Overview

- **Model**: LLaMA 3.1 8B Instruct (GGUF)
- **Inference backend**: llama.cpp (CUDA-enabled)
- **API style**: OpenAI-compatible `/v1/chat/completions`
- **Service framework**: FastAPI
- **Execution**: Fully local (offline once the model is downloaded)

The module is reusable and framework-agnostic, making it suitable for integration
into any frontend or backend system that requires automatic UI translation.

---

## Architecture

React / Web UI
|
| HTTP (JSON)
v
FastAPI LLM Service apps/llm/main.py
|
| OpenAI-style HTTP
v
llama.cpp server llama-server (local process)

---

## Folder Structure

apps/llm/
├── main.py # FastAPI app (public API)
├── server.py # Internal helper calling llama.cpp
├── README.md # This file

---

## Requirements

### Hardware

- NVIDIA GPU strongly recommended
- CUDA-capable GPU tested (RTX 30xx / 40xx)

### Software

- Python 3.10+
- llama.cpp built with CUDA support
- A GGUF LLaMA model file

---

## 1. Start the LLaMA backend (llama.cpp)

This module expects a running llama.cpp server exposing
an OpenAI-compatible completions endpoint.

Example command (Windows, CUDA):

```powershell
llama-server.exe `
  -m C:\models\llama3\Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf `
  --port 7001 `
  --ctx-size 4096 `
  --n-gpu-layers 999
```

Expected endpoint:

http://127.0.0.1:7001/v1/chat/completions

The FastAPI service does NOT start the LLM backend.
llama.cpp must already be running.

## 2. Install Python dependencies

From apps/llm (optionally inside a virtual environment):

```powershell
pip install fastapi uvicorn requests
```

## 3. Run the LLM translation service

From apps/llm:

```powershell
uvicorn main:app --host 127.0.0.1 --port 8001
```

## 4. API Usage

Health check

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "engine": "llm-only",
  "backend": "llama.cpp"
}
```

Single translation

```http
POST /translate
```

Request:

```json
{
  "text": "Hello guys, how are you doing today?",
  "src_lang": "en",
  "tgt_lang": "it",
  "priority": "normal"
}
```

Response:

```json
{
  "translation": "Ciao ragazzi, come state oggi?"
}
```

Batch translation

```http
POST /translate_batch
```

Request

```json
{
  "items": [
    {
      "text": "Save changes",
      "src_lang": "en",
      "tgt_lang": "it",
      "priority": "critical"
    },
    {
      "text": "Cancel",
      "src_lang": "en",
      "tgt_lang": "fr",
      "priority": "normal"
    }
  ]
}
```

Response

```json
{
  "translations": ["Salva le modifiche", "Annuler"]
}
```

---

## Priority Queue (Request Scheduling)

The backend uses a **single-worker priority queue** before calling llama.cpp.
This prevents overload and ensures short/high-value UI strings (like headings) can run before long background paragraphs.

Supported priorities:

- `critical`
- `normal` (default)
- `background`

Notes:

- This backend defaults to one worker to keep llama.cpp load stable and make prioritization deterministic.
- You can increase throughput for long batches (e.g. a full story) by setting `LLM_QUEUE_WORKERS` (default `1`). Start with `2`.

---

## Caching (LRU + TTL)

Translations are cached in-memory to avoid repeated work:

- Cache type: **LRU** with a **TTL**
- Key: `(src_lang, tgt_lang, normalized_text)`
- Scope: process-local (clears when the backend restarts)

Environment variables:

- `TRANSLATION_CACHE_MAX` (default `5000`)
- `TRANSLATION_CACHE_TTL_SECONDS` (default `21600` = 6 hours)

---

## Prompting Strategy

The service uses a **strict prompting strategy** to ensure deterministic,
UI-safe translations suitable for real-time interfaces.

The LLM is instructed to:

- Translate the **entire input text**
- Output **only the translated text**
- Avoid explanations, notes, or alternatives
- Avoid repeating the input text
- Preserve punctuation and sentence boundaries
- Avoid adding quotes or formatting markers

This reduces hallucinations and prevents the model from generating
non-translation content (e.g. explanations or meta-comments).

The strategy is optimized for short-to-medium UI strings such as:

- Buttons and labels
- Dialog messages
- Menu entries
- Notifications
- Tooltips

---

## Notes & Limitations

- Translation quality depends on the selected LLaMA model and its quantization
- Very long inputs/outputs can hit the translation cap (see `apps/llm/server.py` heuristic up to ~512 tokens)
- Language support is **model-driven**, not constrained to fixed language pairs
- The service is intended for **development and experimentation**, not
  large-scale production deployment

Additional limitations:

- Only one llama.cpp call runs at a time from this backend process (queue worker = 1).
- Caching is memory-only (no persistence).

Because the model is prompted rather than fine-tuned,
edge cases may still produce unexpected outputs,
especially for ambiguous or highly informal text.

---

## Project Context

This module implements an **LLM-only translation pipeline**.

It is intentionally **decoupled** from the traditional MT-based system
(Marian / OPUS / CTranslate2), which is maintained separately for:

- Performance comparison
- Translation quality evaluation
- Architectural contrast between LLM-based and MT-based approaches

This separation allows both approaches to be evaluated side-by-side
without introducing implementation dependencies between them.

The LLM module prioritizes **flexibility and language coverage**,
while the MT module focuses on **efficiency and deterministic behavior**.
