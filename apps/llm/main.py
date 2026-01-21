from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from server import translate_with_llm, submit_translation_with_llm, stream_llama_chat
import requests
import threading
import time

app = FastAPI(title="LLM-based Translation Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Req(BaseModel):
    text: str
    src_lang: str
    tgt_lang: str
    priority: str = "normal"


class BatchReq(BaseModel):
    items: List[Req]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatReq(BaseModel):
    messages: List[ChatMessage]


@app.post("/translate")
def translate(req: Req):
    return {
        "translation": translate_with_llm(
            req.text,
            req.src_lang,
            req.tgt_lang,
            priority=req.priority,
        )
    }


@app.post("/translate_batch")
def translate_batch(req: BatchReq):
    futures = [
        submit_translation_with_llm(
            it.text,
            it.src_lang,
            it.tgt_lang,
            priority=it.priority,
        )
        for it in req.items
    ]
    return {
        "translations": [f.result() for f in futures]
    }


@app.post("/chat_stream")
def chat_stream(req: ChatReq):
    def gen():
        for chunk in stream_llama_chat([m.model_dump() for m in req.messages]):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "llm-only",
        "backend": "llama.cpp",
    }


@app.get("/health/llama")
def health_llama():
    base = "http://127.0.0.1:7001"
    # Cache results briefly to avoid hammering llama-server (and to reduce UI lag
    # if a frontend accidentally polls too often).
    #
    # Note: this is only a reachability check, so a small TTL is fine.
    ttl_s = 2.0

    if not hasattr(health_llama, "_cache"):
        health_llama._cache = {"ts": 0.0, "value": None}  # type: ignore[attr-defined]
        health_llama._lock = threading.Lock()  # type: ignore[attr-defined]

    with health_llama._lock:  # type: ignore[attr-defined]
        cached = health_llama._cache  # type: ignore[attr-defined]
        if cached["value"] is not None and (time.time() - cached["ts"]) < ttl_s:
            return cached["value"]

    try:
        r = requests.get(f"{base}/v1/models", timeout=1.5)
        r.raise_for_status()
        j = r.json()
        models = [m.get("id") for m in j.get("data", []) if isinstance(m, dict)]
        value = {"status": "ok", "llama": "up", "models": models}
        with health_llama._lock:  # type: ignore[attr-defined]
            health_llama._cache = {"ts": time.time(), "value": value}  # type: ignore[attr-defined]
        return value
    except Exception as e:
        value = {"status": "degraded", "llama": "down", "error": str(e)}
        with health_llama._lock:  # type: ignore[attr-defined]
            health_llama._cache = {"ts": time.time(), "value": value}  # type: ignore[attr-defined]
        return value
