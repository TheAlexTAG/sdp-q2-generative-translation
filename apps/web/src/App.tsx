import { useEffect } from "react";
import { startDomTextObserver } from "./translation/domTextObserver";
import { Outlet, NavLink } from "react-router-dom";
import { createUiStringBatcher } from "./translation/uiStringBatcher";
import { translateBatch } from "./translation/translationClient";
import { extractPlainText } from "./translation/llmOutput";

const TRANSLATION_LOCK = "__translation_locked__";

export default function App() {
  useEffect(() => {
    const batcher = createUiStringBatcher(300, async (batch) => {
      observer.pause(); // 🔒 stop observing OUR OWN mutations

      try {
        const items = batch.map((b) => ({
          text: b.text,
          src_lang: "en",
          tgt_lang: "it",
        }));

        const res = await translateBatch(items);

        res.translations.forEach((translated, i) => {
          const original = batch[i];
          const clean = extractPlainText(translated);

          if (original.kind === "text") {
            original.node.textContent = clean;
            original.parent.dataset.__translated__ = "true";
          }
        });
      } finally {
        observer.resume(); // 🔓 re-enable observer
      }
    });

    let observer: ReturnType<typeof startDomTextObserver>;

    requestAnimationFrame(() => {
      observer = startDomTextObserver((s) => batcher.push(s));
    });

    return () => observer?.stop();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <nav className="nav">
          <NavLink to="/" className="brand">
            Q2
          </NavLink>
          <NavLink to="/translate">Translate</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">Prototype • Step 0</footer>
    </div>
  );
}
