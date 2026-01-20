import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { translateBatch } from "./auto-translator/translationClient";
import { installAutoTranslator } from "./auto-translator/installAutoTranslator";

export default function App() {
  const location = useLocation();
  const [targetLang, setTargetLang] = useState("it");

  useEffect(() => {
    console.log("im here");
    const cleanup = installAutoTranslator({
      srcLang: "auto",
      tgtLang: targetLang,
      translateBatch,
    });
    return cleanup;
  }, [location.pathname, targetLang]);

  return (
    <div className="app">
      <header className="header">
        <nav className="nav">
          <NavLink to="/" className="brand">
            Q2
          </NavLink>
          <NavLink to="/translate">Translate</NavLink>
          <NavLink to="/about">About</NavLink>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            <option value="it">Italiano</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">Prototype • Step 0</footer>
    </div>
  );
}
