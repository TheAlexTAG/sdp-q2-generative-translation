import { useState } from "react";
import axios from "axios";
import { useLlmActivity } from "../../llmActivity";
import styles from "./Translate.module.css";

export default function Translate() {
  const [src, setSrc] = useState("");
  const [dst, setDst] = useState("");
  const [loading, setLoading] = useState(false);
  const llm = useLlmActivity();

  async function handleTranslate() {
    setLoading(true);
    try {
      const { data } = await llm.run(() =>
        axios.post("/api/translate", {
          text: src,
          src_lang: "it",
          tgt_lang: "en",
        }),
      );
      setDst(data.translation);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Translate</h2>

      <textarea
        className={styles.textarea}
        placeholder="Inserisci testo in italiano…"
        value={src}
        onChange={(e) => setSrc(e.target.value)}
      />

      <button
        className={styles.button}
        disabled={loading || !src.trim()}
        aria-busy={loading}
        onClick={handleTranslate}
      >
        {loading ? "Translating…" : "Translate"}
      </button>

      <div className={styles.box} data-loading={loading && !dst}>
        {dst}
      </div>
    </div>
  );
}
