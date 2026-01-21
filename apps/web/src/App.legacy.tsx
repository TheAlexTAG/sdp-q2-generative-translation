// Legacy copy kept for reference (replaced by App.tsx).
import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { translateBatch } from "./auto-translator/translationClient";
import { installAutoTranslator } from "./auto-translator/installAutoTranslator";
import { useLlmActivity } from "./llmActivity";
import { LlmLoadingPill } from "./components/LlmLoadingPill/LlmLoadingPill";
import { LlmTopBar } from "./components/LlmTopBar/LlmTopBar";
import { LlmStatusText } from "./components/LlmStatusText/LlmStatusText";
import { ConnectionStatus } from "./components/ConnectionStatus/ConnectionStatus";
import {
  LanguageSelect,
  type LanguageCode,
} from "./components/LanguageSelect/LanguageSelect";

export default function App() {
  const location = useLocation();
  const [targetLang, setTargetLang] = useState<LanguageCode>("it");
  const llm = useLlmActivity();

  useEffect(() => {
    const cleanup = installAutoTranslator({
      srcLang: "auto",
      tgtLang: targetLang,
      translateBatch: (items) => llm.run(() => translateBatch(items)),
    });
    return cleanup;
  }, [location.pathname, targetLang]);

  return (
    <div className="app">
      <header className="header">
        <LlmTopBar />
        <nav className="nav">
          <NavLink to="/" className="brand">
            Q2
          </NavLink>
          <NavLink to="/translate">Translate</NavLink>
          <NavLink to="/stories">Stories</NavLink>
          <NavLink to="/chat">Chat</NavLink>
          <NavLink to="/about">About</NavLink>
          {llm.isBusy ? <LlmLoadingPill label="LLM translating…" /> : null}
          {llm.isBusy ? <LlmStatusText /> : null}
          <ConnectionStatus />
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            <option value="it">🇮🇹 Italiano</option>
            <option value="en">🇬🇧 English</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="es">🇪🇸 Español</option>
            <option value="de">🇩🇪 Deutsch</option>
            <option value="ar">🇸🇦 العربية</option>
            <option value="zh">🇨🇳 中文</option>
          </select>
        </nav>
      </header>
      <main className="main">
        <Outlet context={{ targetLang }} />
      </main>
      <footer className="footer">Prototype • Step 0</footer>
    </div>
  );
}
