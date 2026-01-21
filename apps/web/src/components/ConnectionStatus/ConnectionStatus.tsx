import { useEffect, useMemo, useState } from "react";
import styles from "./ConnectionStatus.module.css";

type Status = "checking" | "up" | "down";

async function checkJson(path: string): Promise<boolean> {
  try {
    const res = await fetch(path, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export function ConnectionStatus() {
  const [backend, setBackend] = useState<Status>("checking");
  const [llama, setLlama] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      const backendOk = await checkJson("/api/health");
      const llamaOk = backendOk ? await checkJson("/api/health/llama") : false;
      if (cancelled) return;
      setBackend(backendOk ? "up" : "down");
      setLlama(llamaOk ? "up" : "down");
    }

    tick();
    const id = window.setInterval(tick, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const title = useMemo(() => {
    const b = backend === "up" ? "Backend up" : backend === "down" ? "Backend down" : "Backend checking";
    const l = llama === "up" ? "LLM up" : llama === "down" ? "LLM down" : "LLM checking";
    return `${b} · ${l}`;
  }, [backend, llama]);

  return (
    <div className={styles.wrap} title={title} aria-label={title}>
      <span className={styles.item}>
        <span className={styles.dot} data-status={backend} />
        API
      </span>
      <span className={styles.item}>
        <span className={styles.dot} data-status={llama} />
        LLM
      </span>
    </div>
  );
}

