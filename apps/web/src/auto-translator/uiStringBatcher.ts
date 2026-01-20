import type { UiString } from "./domTextObserver";

export function createUiStringBatcher(
  flushDelayMs: number,
  onFlush: (batch: UiString[]) => void,
) {
  const buffer = new Map<Text | HTMLElement, UiString>();
  let timer: number | null = null;

  function scheduleFlush() {
    if (timer !== null) return;

    timer = window.setTimeout(() => {
      timer = null;
      if (buffer.size === 0) return;

      const batch = Array.from(buffer.values());
      buffer.clear();
      onFlush(batch);
    }, flushDelayMs);
  }

  return {
    push(s: UiString) {
      const key = s.kind === "text" ? s.node : s.el;
      buffer.set(key, s);
      scheduleFlush();
    },
  };
}
