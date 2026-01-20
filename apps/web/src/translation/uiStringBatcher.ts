import type { UiString } from "./domTextObserver";

export function createUiStringBatcher(
  flushDelayMs: number,
  onFlush: (batch: UiString[]) => void,
) {
  const buffer: UiString[] = [];
  let timer: number | null = null;

  function scheduleFlush() {
    if (timer !== null) return;

    timer = window.setTimeout(() => {
      timer = null;
      if (buffer.length === 0) return;

      const batch = buffer.splice(0, buffer.length);
      onFlush(batch);
    }, flushDelayMs);
  }

  return {
    push(s: UiString) {
      buffer.push(s);
      scheduleFlush();
    },
  };
}
