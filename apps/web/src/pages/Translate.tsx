import { useState } from "react";
import axios from "axios";

export default function Translate() {
  const [src, setSrc] = useState("");
  const [dst, setDst] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTranslate() {
    setLoading(true);
    try {
      const { data } = await axios.post("/api/translate", {
        text: src,
        srcLang: "it",
        tgtLang: "en",
      });
      setDst(data.translation);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h2>Translate</h2>
      <textarea
        className="textarea"
        placeholder="Inserisci testo in italiano…"
        value={src}
        onChange={(e) => setSrc(e.target.value)}
      />
      <button
        className="button"
        disabled={loading || !src.trim()}
        onClick={handleTranslate}
      >
        {loading ? "Translating…" : "Translate"}
      </button>
      <div className="box">{dst}</div>
    </div>
  );
}
