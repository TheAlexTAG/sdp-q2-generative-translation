import styles from "./Home.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Q2 — Generative Translation</h1>
      <p className={styles.subtitle}>
        Minimal demo. Input → mock API → output. Real model later.
      </p>
    </div>
  );
}
