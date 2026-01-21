from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from server import translate_with_llm, stream_llama_chat
import requests

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
    return {
        "translations": [
            translate_with_llm(it.text, it.src_lang, it.tgt_lang, priority=it.priority)
            for it in req.items
        ]
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
    try:
        r = requests.get(f"{base}/v1/models", timeout=1.5)
        r.raise_for_status()
        j = r.json()
        models = [m.get("id") for m in j.get("data", []) if isinstance(m, dict)]
        return {"status": "ok", "llama": "up", "models": models}
    except Exception as e:
        return {"status": "degraded", "llama": "down", "error": str(e)}
