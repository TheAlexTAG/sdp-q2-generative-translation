/**
 * Small utility for grouping detected UI strings into time-based batches
 * before sending them to the translation pipeline.
 */

import type { UiString } from "./domTextObserver";

export function createUiStringBatcher(
  flushDelayMs: number,
  onFlush: (batch: UiString[]) => void,
) {
  // Buffer keyed by DOM node to avoid duplicate entries in the same batch.
  const buffer = new Map<Text | HTMLElement, UiString>();
  let timer: number | null = null;

  // Schedules a delayed flush to batch multiple detections together.
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
