import { useEffect, useMemo, useRef, useState } from "react";
import { useLlmActivity } from "../../llmActivity";
import styles from "./LlmStatusText.module.css";

const DEFAULT_MESSAGES = [
  "Warming up…",
  "Reading context…",
  "Translating…",
  "Refining output…",
  "Almost done…",
];

export function LlmStatusText({ messages = DEFAULT_MESSAGES }: { messages?: string[] }) {
  const llm = useLlmActivity();
  const startedAtRef = useRef<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!llm.isBusy) {
      startedAtRef.current = null;
      return;
    }
    if (!startedAtRef.current) {
      startedAtRef.current = Date.now();
    }
    const id = window.setInterval(() => setTick((t) => t + 1), 300);
    return () => window.clearInterval(id);
  }, [llm.isBusy]);

  const message = useMemo(() => {
    if (!llm.isBusy) return null;
    const startedAt = startedAtRef.current ?? Date.now();
    const elapsedMs = Date.now() - startedAt;
    const baseIndex = Math.floor(elapsedMs / 1400);
    const index = baseIndex % Math.max(1, messages.length);
    return messages[index] ?? "Working…";
  }, [llm.isBusy, messages, tick]);

  if (!message) return null;

  return (
    <span className={styles.status} aria-live="polite">
      {message}
      <span className={styles.dots} aria-hidden="true" />
    </span>
  );
}

