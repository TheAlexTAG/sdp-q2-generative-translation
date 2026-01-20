from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from server import translate_with_llm

app = FastAPI(title="LLM-based Translation Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Req(BaseModel):
    text: str
    src_lang: str
    tgt_lang: str


class BatchReq(BaseModel):
    items: List[Req]


@app.post("/translate")
def translate(req: Req):
    return {
        "translation": translate_with_llm(
            req.text,
            req.src_lang,
            req.tgt_lang,
        )
    }


@app.post("/translate_batch")
def translate_batch(req: BatchReq):
    return {
        "translations": [
            translate_with_llm(it.text, it.src_lang, it.tgt_lang)
            for it in req.items
        ]
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "llm-only",
        "backend": "llama.cpp",
    }
