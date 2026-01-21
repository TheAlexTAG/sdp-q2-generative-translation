import { useMemo, useState } from "react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";
import { useLlmActivity } from "../../llmActivity";
import styles from "./StructuredTranslate.module.css";

type OutletCtx = { targetLang?: string };

function linesToItems(input: string) {
  return input
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function StructuredTranslate() {
  const { targetLang = "en" } = useOutletContext<OutletCtx>();
  const llm = useLlmActivity();

  const [wordsInput, setWordsInput] = useState("");
  const [sentencesInput, setSentencesInput] = useState("");
  const [paragraphInput, setParagraphInput] = useState("");

  const [wordsOut, setWordsOut] = useState<string[]>([]);
  const [sentencesOut, setSentencesOut] = useState<string[]>([]);
  const [paragraphOut, setParagraphOut] = useState("");

  const [wordsLoading, setWordsLoading] = useState(false);
  const [sentencesLoading, setSentencesLoading] = useState(false);
  const [paragraphLoading, setParagraphLoading] = useState(false);

  const [wordsError, setWordsError] = useState<string | null>(null);
  const [sentencesError, setSentencesError] = useState<string | null>(null);
  const [paragraphError, setParagraphError] = useState<string | null>(null);

  const wordItems = useMemo(() => linesToItems(wordsInput), [wordsInput]);
  const sentenceItems = useMemo(
    () => linesToItems(sentencesInput),
    [sentencesInput],
  );

  async function translateBatch(
    items: string[],
    setOut: (v: string[]) => void,
    setError: (v: string | null) => void,
  ) {
    const { data } = await llm.run(() =>
      axios.post("/api/translate_batch", {
        items: items.map((text) => ({
          text,
          src_lang: "auto",
          tgt_lang: targetLang,
        })),
      }),
    );
    setOut(data.translations ?? []);
    setError(null);
  }

  async function translateWords() {
    if (wordItems.length === 0) return;
    setWordsError(null);
    setWordsLoading(true);
    setWordsOut([]);
    try {
      await translateBatch(wordItems, setWordsOut, setWordsError);
    } catch (e) {
      setWordsError(e instanceof Error ? e.message : String(e));
    } finally {
      setWordsLoading(false);
    }
  }

  async function translateSentences() {
    if (sentenceItems.length === 0) return;
    setSentencesError(null);
    setSentencesLoading(true);
    setSentencesOut([]);
    try {
      await translateBatch(sentenceItems, setSentencesOut, setSentencesError);
    } catch (e) {
      setSentencesError(e instanceof Error ? e.message : String(e));
    } finally {
      setSentencesLoading(false);
    }
  }

  async function translateParagraph() {
    const text = paragraphInput.trim();
    if (!text) return;
    setParagraphError(null);
    setParagraphLoading(true);
    setParagraphOut("");
    try {
      const { data } = await llm.run(() =>
        axios.post("/api/translate", {
          text,
          src_lang: "auto",
          tgt_lang: targetLang,
        }),
      );
      setParagraphOut(data.translation ?? "");
    } catch (e) {
      setParagraphError(e instanceof Error ? e.message : String(e));
    } finally {
      setParagraphLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headText}>
          <div className={styles.kicker}>Structured translate</div>
          <h2 className={styles.title}>Words. Sentences. Paragraphs.</h2>
          <p className={styles.subtitle}>
            Each section is independently scrollable. Target language:{" "}
            <span className={styles.target}>{targetLang}</span>
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Words</div>
              <div className={styles.cardHint}>One per line</div>
            </div>
          </div>

          <textarea
            className={styles.input}
            value={wordsInput}
            onChange={(e) => setWordsInput(e.target.value)}
            placeholder={"hello\nworld\ncomputer\nscience"}
          />

          <div className={styles.actions}>
            <button
              className={styles.primary}
              onClick={translateWords}
              disabled={wordsLoading || wordItems.length === 0}
              aria-busy={wordsLoading}
            >
              Translate
            </button>
            <button
              className={styles.secondary}
              onClick={() => {
                setWordsInput("");
                setWordsOut([]);
                setWordsError(null);
              }}
              disabled={wordsLoading}
            >
              Clear
            </button>
          </div>

          {wordsError ? <div className={styles.error}>{wordsError}</div> : null}

          <div
            className={styles.scroll}
            data-loading={wordsLoading && wordsOut.length === 0}
          >
            {wordItems.map((src, i) => (
              <div key={`${src}-${i}`} className={styles.row}>
                <div className={styles.src}>{src}</div>
                <div className={styles.dst}>{wordsOut[i] ?? ""}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Sentences</div>
              <div className={styles.cardHint}>One per line</div>
            </div>
          </div>

          <textarea
            className={styles.input}
            value={sentencesInput}
            onChange={(e) => setSentencesInput(e.target.value)}
            placeholder={
              "How are you?\nThis is a longer sentence.\nPlease translate this."
            }
          />

          <div className={styles.actions}>
            <button
              className={styles.primary}
              onClick={translateSentences}
              disabled={sentencesLoading || sentenceItems.length === 0}
              aria-busy={sentencesLoading}
            >
              Translate
            </button>
            <button
              className={styles.secondary}
              onClick={() => {
                setSentencesInput("");
                setSentencesOut([]);
                setSentencesError(null);
              }}
              disabled={sentencesLoading}
            >
              Clear
            </button>
          </div>

          {sentencesError ? (
            <div className={styles.error}>{sentencesError}</div>
          ) : null}

          <div
            className={styles.scroll}
            data-loading={sentencesLoading && sentencesOut.length === 0}
          >
            {sentenceItems.map((src, i) => (
              <div key={`${src}-${i}`} className={styles.row}>
                <div className={styles.src}>{src}</div>
                <div className={styles.dst}>{sentencesOut[i] ?? ""}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Paragraph</div>
              <div className={styles.cardHint}>Multi-line</div>
            </div>
          </div>

          <textarea
            className={styles.input}
            value={paragraphInput}
            onChange={(e) => setParagraphInput(e.target.value)}
            placeholder={
              "Paste a paragraph here.\n\nThis section is best for full text."
            }
          />

          <div className={styles.actions}>
            <button
              className={styles.primary}
              onClick={translateParagraph}
              disabled={paragraphLoading || !paragraphInput.trim()}
              aria-busy={paragraphLoading}
            >
              Translate
            </button>
            <button
              className={styles.secondary}
              onClick={() => {
                setParagraphInput("");
                setParagraphOut("");
                setParagraphError(null);
              }}
              disabled={paragraphLoading}
            >
              Clear
            </button>
          </div>

          {paragraphError ? (
            <div className={styles.error}>{paragraphError}</div>
          ) : null}

          <div
            className={styles.scroll}
            data-loading={paragraphLoading && !paragraphOut}
          >
            <div className={styles.paragraph}>{paragraphOut}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

