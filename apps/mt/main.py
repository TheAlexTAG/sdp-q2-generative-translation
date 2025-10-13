from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import Dict, Tuple
import ctranslate2 as ct2
import sentencepiece as spm

BASE = Path(__file__).parent.resolve()
REGISTRY = BASE / "registry.tsv"

app = FastAPI(title="MT (CTranslate2 + Marian/OPUS-MT)")

class Req(BaseModel):
    text: str
    src_lang: str
    tgt_lang: str
    options: dict | None = None

# Load registry lines:
# pair \t ct2_dir \t spm_src \t spm_tgt \t tok_dir(optional)
_pairs: Dict[Tuple[str, str], dict] = {}
if REGISTRY.exists():
    for line in REGISTRY.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        # tolerate both 4- and 5-column registries
        if len(parts) >= 4:
            pair, ct2_dir, spm_src, spm_tgt = parts[:4]
            src, tgt = pair.split("->")
            _pairs[(src, tgt)] = dict(ct2_dir=ct2_dir, spm_src=spm_src, spm_tgt=spm_tgt)
else:
    print("WARNING: registry.tsv not found. Run convert.py first.")

_translators: Dict[Tuple[str, str], ct2.Translator] = {}
_src_tok: Dict[str, spm.SentencePieceProcessor] = {}
_tgt_tok: Dict[str, spm.SentencePieceProcessor] = {}

def get_pair(src: str, tgt: str):
    key = (src, tgt)
    cfg = _pairs.get(key)
    if not cfg:
        raise HTTPException(status_code=400, detail=f"unsupported_pair {src}->{tgt}")
    if key not in _translators:
        _translators[key] = ct2.Translator(cfg["ct2_dir"], device="cpu")
    if cfg["spm_src"] not in _src_tok:
        _src_tok[cfg["spm_src"]] = spm.SentencePieceProcessor(model_file=cfg["spm_src"])
    if cfg["spm_tgt"] not in _tgt_tok:
        _tgt_tok[cfg["spm_tgt"]] = spm.SentencePieceProcessor(model_file=cfg["spm_tgt"])
    return _translators[key], _src_tok[cfg["spm_src"]], _tgt_tok[cfg["spm_tgt"]]

@app.get("/health")
def health():
    return {"status": "ok", "pairs": [f"{s}->{t}" for (s, t) in _pairs.keys()], "device": "cpu"}

@app.post("/translate")
def translate(r: Req):
    if r.src_lang == r.tgt_lang:
        return {"translation": r.text}

    translator, sp_src, sp_tgt = get_pair(r.src_lang, r.tgt_lang)

    pieces = sp_src.encode(r.text, out_type=str)

    pieces_in = pieces + ["</s>"]

    opts = r.options or {}
    beam_size = int(opts.get("beam_size", 4))
    max_len = int(opts.get("max_new_tokens", 200))

    results = translator.translate_batch(
        [pieces_in],
        beam_size=beam_size,
        max_decoding_length=max_len,
        end_token="</s>",
    )

    best = results[0].hypotheses[0] if results and results[0].hypotheses else []

    best = [t for t in best if t != "</s>"]

    text_out = sp_tgt.decode_pieces(best)

    return {"translation": text_out}
