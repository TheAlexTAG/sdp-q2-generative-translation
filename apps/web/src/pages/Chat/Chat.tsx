import { useMemo, useRef, useState } from "react";
import { useLlmActivity } from "../../llmActivity";
import styles from "./Chat.module.css";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function decodeSseChunks(buffer: string) {
  const events: string[] = [];
  while (true) {
    const idx = buffer.indexOf("\n\n");
    if (idx === -1) break;
    const raw = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 2);
    const lines = raw.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      // Keep leading whitespace in streamed tokens (critical for readable output).
      // SSE format is `data: <payload>` so we strip at most one space after `data:`.
      let payload = line.slice("data:".length);
      if (payload.startsWith(" ")) payload = payload.slice(1);
      events.push(payload);
    }
  }
  return { events, rest: buffer };
}

async function postSse(
  url: string,
  body: unknown,
  onData: (chunk: string) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = decodeSseChunks(buffer);
    buffer = rest;
    for (const ev of events) onData(ev);
  }
}

export default function Chat() {
  const llm = useLlmActivity();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: "You are a helpful assistant." },
  ]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const viewMessages = useMemo(
    () => messages.filter((m) => m.role !== "system"),
    [messages],
  );

  async function send() {
    const text = input.trim();
    if (!text) return;

    setError(null);
    setInput("");

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const end = llm.begin();
    try {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: "" },
      ]);

      await postSse(
        "/api/chat_stream",
        {
          messages: [...messages, { role: "user", content: text }],
        },
        (chunk) => {
          if (chunk === "[DONE]") return;
          setMessages((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].role === "assistant") {
                next[i] = { ...next[i], content: next[i].content + chunk };
                break;
              }
            }
            return next;
          });
        },
        abortRef.current.signal,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      end();
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Chat</h2>
        <div className={styles.hint}>
          Talk to the model through FastAPI → llama-server
        </div>
      </div>

      <div className={styles.timeline}>
        {viewMessages.map((m, idx) => (
          <div
            key={idx}
            className={
              m.role === "user" ? styles.userBubble : styles.assistantBubble
            }
          >
            {m.content || (m.role === "assistant" ? <span className={styles.cursor} /> : null)}
          </div>
        ))}
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.composer}>
        <input
          className={styles.input}
          value={input}
          placeholder="Ask something…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button className={styles.send} onClick={send} disabled={!input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
