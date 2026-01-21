/**
 * Main entry point for installing the automatic UI translation module.
 *
 * This module connects DOM detection, prioritization, batching, backend
 * communication, and safe application of translated content.
 */

import {
  startDomTextObserver,
  markTranslated,
  preMarkTranslated,
  getTranslatedMark,
  type UiString,
  resetTranslatedState,
} from "./domTextObserver";
import { extractPlainText } from "./llmOutput";

type TranslatorItem = {
  text: string;
  src_lang: string;
  tgt_lang: string;
  priority?: "critical" | "normal" | "background";
};

type TranslateBatchFn = (
  items: TranslatorItem[],
  opts?: { signal?: AbortSignal },
) => Promise<{ translations: string[] }>;

// Configuration options provided by the host application at install time.
export type InstallAutoTranslatorOptions = {
  srcLang: string;
  tgtLang: string;
  translateBatch: TranslateBatchFn;
  flushDelayMs?: number;
};

// Text fingerprinting is used to detect whether the DOM content has changed
// between detection and translation, preventing stale updates.

function normalizeForFingerprint(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function fnv1a32Hex(s: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function fingerprintText(s: string) {
  return fnv1a32Hex(normalizeForFingerprint(s));
}

function normalizeForBackend(s: string) {
  return s
    .replace(/[\u2014\u2013\u2015\u2212]/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

// Applies safety checks to model output to ensure UI-appropriate translations
// (e.g., no explanations, excessive length, or formatting artifacts).
function sanitizeUiTranslation(original: string, translated: string) {
  translated = translated.replace(/\s+/g, " ").trim();

  // If the model inserts line breaks, keep the content (UI + paragraphs)
  translated = translated.replace(/\s*\n+\s*/g, " ").trim();

  // Be strict for short UI strings, more permissive for longer text blocks.
  const maxRatio = original.length <= 60 ? 2 : 3.5;
  if (translated.length > Math.max(40, original.length * maxRatio)) {
    return original;
  }

  const META_PATTERNS = [
    "means",
    "is translated",
    "può essere",
    "è un termine",
    "si riferisce",
  ];

  for (const p of META_PATTERNS) {
    if (translated.toLowerCase().includes(p)) {
      return original;
    }
  }

  return translated;
}

export function installAutoTranslator({
  srcLang,
  tgtLang,
  translateBatch,
  flushDelayMs = 300,
}: InstallAutoTranslatorOptions) {
  let observer: ReturnType<typeof startDomTextObserver> | null = null;
  const abortController = new AbortController();

  // Reset all internal translation state when installing the module.
  resetTranslatedState();

  const translationCache = new Map<string, string>();

  type Priority = "critical" | "normal" | "background";
  const priorityValue: Record<Priority, number> = {
    critical: 0,
    normal: 1,
    background: 2,
  };

  type PendingKey = {
    key: string;
    item: TranslatorItem;
    priority: Priority;
    score: number; // smaller = sooner
  };

  const pendingByKey = new Map<string, PendingKey>();
  const waitingNodesByKey = new Map<
    string,
    { node: UiString; expectedFingerprint: string }[]
  >();

  const queues: Record<Priority, PendingKey[]> = {
    critical: [],
    normal: [],
    background: [],
  };

  const MAX_PENDING_KEYS = 2500;

  let stopped = false;
  let running = false;
  let timer: number | null = null;

  function getPriorityTarget(s: UiString): Element {
    return s.kind === "text" ? s.parent : s.el;
  }

  function isHeading(el: Element) {
    const tag = el.tagName?.toLowerCase();
    if (!tag) return false;
    if (tag === "h1" || tag === "h2" || tag === "h3") return true;
    return Boolean(el.closest?.("h1,h2,h3"));
  }

  function isInViewport(el: Element) {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  // Assigns translation priority based on UI relevance.
  // Headings and visible content are translated before background text.
  function classifyPriority(s: UiString): Priority {
    const el = getPriorityTarget(s);
    if (isHeading(el)) return "critical";
    if (isInViewport(el)) return "normal";
    return "background";
  }

  function currentUiText(s: UiString) {
    if (s.kind === "text") return (s.node.textContent ?? "").trim();
    return (s.el.getAttribute("placeholder") ?? "").trim();
  }

  function applyToNode(
    s: UiString,
    translated: string,
    expectedFingerprint: string,
  ) {
    const current = currentUiText(s);
    if (!current) return;

    const currentFingerprint = fingerprintText(current);
    if (currentFingerprint !== expectedFingerprint) {
      return;
    }

    const translatedFingerprint = fingerprintText(translated);
    if (s.kind === "text") {
      preMarkTranslated(s, tgtLang, translatedFingerprint);
      s.node.textContent = translated;
      markTranslated(s, tgtLang, translatedFingerprint);
    } else {
      s.el.setAttribute("placeholder", translated);
      markTranslated(s, tgtLang, translatedFingerprint);
    }
  }

  function schedule(delayMs: number) {
    if (stopped) return;
    if (running) return;
    if (timer !== null) return;
    timer = window.setTimeout(() => {
      timer = null;
      void processQueue();
    }, delayMs);
  }

  // Enqueues a detected UI string for translation, handling caching,
  // priority upgrades, and deduplication across multiple DOM nodes.
  function enqueue(s: UiString) {
    const key = s.text;

    // If this node/element already contains our translated output for the current
    // target language, never re-queue it.
    const existingMark = getTranslatedMark(s);
    if (existingMark?.lang === tgtLang) {
      const fp = fingerprintText(currentUiText(s));
      if (fp && fp === existingMark.fingerprint) {
        return;
      }
    }

    const expectedFingerprint = fingerprintText(currentUiText(s));

    const nextPriority = classifyPriority(s);
    if (
      pendingByKey.size >= MAX_PENDING_KEYS &&
      nextPriority === "background"
    ) {
      return;
    }

    const cached = translationCache.get(key);
    if (cached) {
      applyToNode(s, cached, expectedFingerprint);
      return;
    }

    const waiting = waitingNodesByKey.get(key);
    if (waiting) waiting.push({ node: s, expectedFingerprint });
    else waitingNodesByKey.set(key, [{ node: s, expectedFingerprint }]);

    const nextScore = key.length;

    const existing = pendingByKey.get(key);
    if (existing) {
      const upgradedPriority =
        priorityValue[nextPriority] < priorityValue[existing.priority]
          ? nextPriority
          : existing.priority;
      const upgradedScore = Math.min(existing.score, nextScore);

      if (upgradedPriority !== existing.priority) {
        queues[existing.priority] = queues[existing.priority].filter(
          (x) => x !== existing,
        );
        existing.priority = upgradedPriority;
        queues[existing.priority].push(existing);
      }

      existing.score = upgradedScore;
      schedule(nextPriority === "critical" ? 0 : flushDelayMs);
      return;
    }

    const pk: PendingKey = {
      key,
      item: {
        text: normalizeForBackend(key),
        src_lang: srcLang,
        tgt_lang: tgtLang,
        priority: nextPriority,
      },
      priority: nextPriority,
      score: nextScore,
    };

    pendingByKey.set(key, pk);
    queues[nextPriority].push(pk);
    schedule(nextPriority === "critical" ? 0 : flushDelayMs);
  }

  function takeSmallestN(q: PendingKey[], n: number): PendingKey[] {
    if (q.length <= n) return q.splice(0, q.length);

    const best: PendingKey[] = [];

    for (const item of q) {
      if (best.length < n) {
        best.push(item);
        best.sort((a, b) => a.score - b.score);
        continue;
      }

      if (item.score >= best[best.length - 1].score) continue;

      best.push(item);
      best.sort((a, b) => a.score - b.score);
      best.length = n;
    }

    const selected = new Set(best);
    const remaining: PendingKey[] = [];
    for (const item of q) {
      if (!selected.has(item)) remaining.push(item);
    }
    q.length = 0;
    q.push(...remaining);
    return best;
  }

  function getNextBatch(): PendingKey[] | null {
    const priority: Priority | null = queues.critical.length
      ? "critical"
      : queues.normal.length
        ? "normal"
        : queues.background.length
          ? "background"
          : null;

    if (!priority) return null;

    const batchSize =
      priority === "critical" ? 10 : priority === "normal" ? 8 : 4;

    return takeSmallestN(queues[priority], batchSize);
  }

  // Processes queued translation requests by priority, sending batched
  // requests to the backend and applying results incrementally.
  async function processQueue() {
    if (stopped) return;
    if (running) return;
    running = true;

    try {
      while (!stopped) {
        const batch = getNextBatch();
        if (!batch || batch.length === 0) break;

        let res: { translations: string[] } | null = null;
        try {
          res = await translateBatch(
            batch.map((b) => b.item),
            {
              signal: abortController.signal,
            },
          );
        } catch {
          res = null;
        }

        if (stopped) break;

        observer?.pause();
        try {
          batch.forEach((b, idx) => {
            const translatedRaw = res?.translations?.[idx] ?? "";
            const extracted = extractPlainText(translatedRaw);
            const translatedText =
              extracted.kind === "ok"
                ? sanitizeUiTranslation(b.key, extracted.text)
                : b.key;

            translationCache.set(b.key, translatedText);

            const waitingNow = waitingNodesByKey.get(b.key) ?? [];
            for (const { node, expectedFingerprint } of waitingNow) {
              applyToNode(node, translatedText, expectedFingerprint);
            }

            waitingNodesByKey.delete(b.key);
            pendingByKey.delete(b.key);
          });
        } finally {
          observer?.resume();
        }
      }
    } finally {
      running = false;
      if (!stopped) {
        const hasMore =
          queues.critical.length ||
          queues.normal.length ||
          queues.background.length;
        if (hasMore) schedule(0);
      }
    }
  }

  // Start observing the DOM and enqueue detected UI strings for translation.
  observer = startDomTextObserver((s) => enqueue(s));

  // Cleanup function to fully stop translation, abort pending requests,
  // and release all associated resources.
  return () => {
    stopped = true;
    abortController.abort();
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    observer?.stop();
    observer = null;
    translationCache.clear();
    pendingByKey.clear();
    waitingNodesByKey.clear();
    queues.critical.length = 0;
    queues.normal.length = 0;
    queues.background.length = 0;
  };
}
