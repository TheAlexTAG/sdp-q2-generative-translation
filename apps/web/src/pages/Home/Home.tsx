import { NoTranslate } from "../../auto-translator/NoTranslate";
import styles from "./Home.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      {/* HERO */}
      <header className={styles.hero}>
        <h1 className={styles.title}>
          <NoTranslate>Q2</NoTranslate> — Generative Translation
        </h1>

        <p className={styles.tagline}>
          Local, automatic UI translation powered by a large language model.
        </p>
      </header>

      {/* WHAT IT IS */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>What is this?</h2>
        <p className={styles.text}>
          This project demonstrates a fully local system for automatic interface
          translation. As you browse the application, visible text is detected
          on the client, grouped into prioritized batches, and translated in
          real time by a locally running language model.
        </p>

        <p className={styles.text}>
          Translations are applied progressively: short UI labels appear almost
          instantly, while longer paragraphs are processed in the background.
          The goal is to preserve responsiveness and avoid blocking the user
          interface.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How it works</h2>
        <ul className={styles.list}>
          <li>On-screen text nodes are detected dynamically in the browser</li>
          <li>Content is batched and prioritized based on UI relevance</li>
          <li>A local LLM performs translation without cloud services</li>
          <li>Results are cached to avoid repeated translations</li>
        </ul>
      </section>

      {/* MODEL */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Language model</h2>
        <p className={styles.text}>
          All translations are generated using a locally hosted LLaMA model
          served through <code>llama.cpp</code>. No external APIs or third-party
          translation services are used.
        </p>
      </section>

      {/* CREDITS */}
      <footer className={styles.footer}>
        <p className={styles.credits}>
          <NoTranslate>
            Developed by Alex Barascu, Nadim Aride, Zein Alabedin Ismail
          </NoTranslate>
        </p>
      </footer>
    </div>
  );
}
