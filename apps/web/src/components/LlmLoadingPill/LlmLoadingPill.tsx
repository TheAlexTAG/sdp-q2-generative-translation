import styles from "./LlmLoadingPill.module.css";

function normalizeLabel(label: string) {
  // Hide mojibake characters from earlier builds.
  if (/[�ƒÐ]/.test(label)) return "LLM translating…";
  return label;
}

export function LlmLoadingPill({ label = "Translating…" }: { label?: string }) {
  return (
    <div className={styles.pill} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      <span>{normalizeLabel(label)}</span>
    </div>
  );
}
