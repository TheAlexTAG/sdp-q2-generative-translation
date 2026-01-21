type BatchItem = {
  text: string;
  src_lang: string;
  tgt_lang: string;
  priority?: "critical" | "normal" | "background";
};

export async function translateBatch(items: BatchItem[]) {
  const res = await fetch("/api/translate_batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    throw new Error(`Translation failed: ${res.status}`);
  }

  return res.json() as Promise<{ translations: string[] }>;
}
