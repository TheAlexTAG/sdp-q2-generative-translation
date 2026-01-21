/**
 * Client-side helper for sending batched translation requests
 * to the backend translation API.
 */

type BatchItem = {
  text: string;
  src_lang: string;
  tgt_lang: string;
  priority?: "critical" | "normal" | "background";
};

// Sends a batch translation request with timeout and abort support
// to prevent stalled or overlapping requests.
export async function translateBatch(
  items: BatchItem[],
  opts?: { signal?: AbortSignal },
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 60_000);

  const onAbort = () => controller.abort();
  if (opts?.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const res = await fetch("/api/translate_batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Translation failed: ${res.status}`);
    }

    return res.json() as Promise<{ translations: string[] }>;
  } finally {
    if (opts?.signal) opts.signal.removeEventListener("abort", onAbort);
    window.clearTimeout(timeoutId);
  }
}
