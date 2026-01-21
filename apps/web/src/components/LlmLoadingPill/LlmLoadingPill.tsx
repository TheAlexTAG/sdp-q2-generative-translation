import styles from "./LlmLoadingPill.module.css";

export function LlmLoadingPill({ label = "Translating…" }: { label?: string }) {
  return (
    <div className={styles.pill} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

