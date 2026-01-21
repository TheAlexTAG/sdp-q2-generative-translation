import {
  startDomTextObserver,
  markTranslated,
  preMarkTranslated,
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
) => Promise<{ translations: string[] }>;

export type InstallAutoTranslatorOptions = {
  srcLang: string;
  tgtLang: string;
  translateBatch: TranslateBatchFn;
  flushDelayMs?: number;
};

function normalizeForBackend(s: string) {
  return s
    .replace(/[\u2014\u2013\u2015\u2212]/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

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

  // 🔥 RESET EVERYTHING WHEN (RE)INSTALLING
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
  const waitingNodesByKey = new Map<string, UiString[]>();

  const queues: Record<Priority, PendingKey[]> = {
    critical: [],
    normal: [],
    background: [],
  };

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

  function classifyPriority(s: UiString): Priority {
    const el = getPriorityTarget(s);
    if (isHeading(el)) return "critical";
    if (isInViewport(el)) return "normal";
    return "background";
  }

  function applyToNode(s: UiString, translated: string) {
    if (s.kind === "text") {
      preMarkTranslated(s);
      s.node.textContent = translated;
      markTranslated(s);
    } else {
      s.el.setAttribute("placeholder", translated);
      markTranslated(s);
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

  function enqueue(s: UiString) {
    const key = s.text;

    const cached = translationCache.get(key);
    if (cached) {
      applyToNode(s, cached);
      return;
    }

    const waiting = waitingNodesByKey.get(key);
    if (waiting) waiting.push(s);
    else waitingNodesByKey.set(key, [s]);

    const nextPriority = classifyPriority(s);
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
      priority === "critical" ? 6 : priority === "normal" ? 4 : 2;

    const q = queues[priority];
    q.sort((a, b) => a.score - b.score);
    return q.splice(0, batchSize);
  }

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
          res = await translateBatch(batch.map((b) => b.item));
        } catch {
          res = null;
        }

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
            for (const node of waitingNow) {
              applyToNode(node, translatedText);
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
          queues.critical.length || queues.normal.length || queues.background.length;
        if (hasMore) schedule(0);
      }
    }
  }

  observer = startDomTextObserver((s) => enqueue(s));

  return () => {
    stopped = true;
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
