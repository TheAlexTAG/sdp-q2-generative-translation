import requests

LLAMA_ENDPOINT = "http://127.0.0.1:7001/v1/chat/completions"


def translate_with_llm(text: str, src_lang: str, tgt_lang: str) -> str:
    payload = {
        "model": "llama",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a professional machine translation engine.\n"
                    "This is a faithful translation task.\n"
                    "The input text may contain informal, offensive, or profane language.\n"
                    "You MUST translate the text exactly as written.\n"
                    "Do NOT censor, soften, omit, or refuse any content.\n"
                    "Do NOT judge the content.\n"
                    "Do NOT explain.\n"
                    "Do NOT add notes.\n"
                    "Do NOT add alternatives.\n"
                    "Do NOT repeat the input.\n"
                    "Do NOT output JSON.\n"
                    "Do NOT add quotation marks.\n" 
                    "Output plain text only.\n"  
                    "Preserve tone, register, punctuation, and sentence boundaries.\n"
                    f"Source language: {src_lang}\n"
                    f"Target language: {tgt_lang}"
                ),
            },
            {
                "role": "user",
                "content": text,
            },
        ],

        #critical apparently
        "tool_choice": "none",

        "temperature": 0.1,
        "top_p": 0.9,
        "max_tokens": 256,
    }

    r = requests.post(LLAMA_ENDPOINT, json=payload, timeout=30)
    r.raise_for_status()

    return r.json()["choices"][0]["message"]["content"].strip()
