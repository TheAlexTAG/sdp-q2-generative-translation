import { useEffect, useRef, useState } from "react";
import { useLlmActivity } from "../../llmActivity";
import styles from "./LlmTopBar.module.css";

export function LlmTopBar() {
  const llm = useLlmActivity();
  const [isVisible, setIsVisible] = useState(false);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (llm.isBusy) {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setIsVisible(true);
      return;
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      hideTimeoutRef.current = null;
    }, 450);
  }, [llm.isBusy]);

  if (!isVisible) return null;

  return (
    <div
      className={styles.topBar}
      aria-hidden="true"
      data-running={llm.isBusy}
    />
  );
}

