import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import styles from "./Stories.module.css";
import { STORIES } from "./storiesData";

type OutletCtx = { targetLang?: string };

function randomIndex(max: number) {
  if (max <= 1) return 0;
  const cryptoObj = window.crypto;
  if (cryptoObj?.getRandomValues) {
    const arr = new Uint32Array(1);
    cryptoObj.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export default function StoriesAutoClean() {
  const { targetLang = "en" } = useOutletContext<OutletCtx>();
  const [activeId, setActiveId] = useState<string>(STORIES[0].id);
  const [animateKey, setAnimateKey] = useState(0);

  const story = useMemo(
    () => STORIES.find((s) => s.id === activeId) ?? STORIES[0],
    [activeId],
  );

  useEffect(() => {
    setActiveId(STORIES[randomIndex(STORIES.length)].id);
    setAnimateKey((k) => k + 1);
  }, []);

  function pickAnother() {
    if (STORIES.length === 1) return;
    let next = story.id;
    while (next === story.id) {
      next = STORIES[randomIndex(STORIES.length)].id;
    }
    setActiveId(next);
    setAnimateKey((k) => k + 1);
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Dynamic Text</h2>
          <p className={styles.subtitle}>
            Auto-translation happens progressively as the LLM returns results.
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.shuffle} onClick={pickAnother}>
            Another story
          </button>
        </div>
      </div>

      <article key={animateKey} className={styles.card}>
        <div className={styles.cardTop}>
          <div className={styles.badge}>Story</div>
          <div className={styles.meta}>
            #{STORIES.findIndex((s) => s.id === story.id) + 1} / {STORIES.length}
            <span className={styles.metaDot}>•</span>
            <span>Auto-translate: {targetLang}</span>
          </div>
        </div>
        <h3 className={styles.storyTitle}>{story.title}</h3>
        <div className={styles.storySubtitle}>{story.subtitle}</div>
        <div className={styles.body}>
          {story.body.map((p, i) => (
            <p key={i} className={styles.p}>
              {p}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}

