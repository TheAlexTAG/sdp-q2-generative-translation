import {
  startDomTextObserver,
  markTranslated,
  preMarkTranslated,
  type UiString,
  resetTranslatedState,
} from "./domTextObserver";
import { createUiStringBatcher } from "./uiStringBatcher";
import { extractPlainText } from "./llmOutput";

type TranslatorItem = {
  text: string;
  src_lang: string;
  tgt_lang: string;
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
  if (translated.includes("\n")) {
    translated = translated.split("\n")[0].trim();
  }

  if (translated.length > original.length * 2) {
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

  const inFlightStrings = new Set<string>();
  const translatedStrings = new Set<string>();

  const batcher = createUiStringBatcher(
    flushDelayMs,
    async (batch: UiString[]) => {
      observer?.pause();

      const pending: {
        original: UiString;
        key: string;
        item: TranslatorItem;
      }[] = [];

      for (const b of batch) {
        const key = b.text;

        if (translatedStrings.has(key)) continue;
        if (inFlightStrings.has(key)) continue;

        inFlightStrings.add(key);

        pending.push({
          original: b,
          key,
          item: {
            text: normalizeForBackend(b.text),
            src_lang: srcLang,
            tgt_lang: tgtLang,
          },
        });
      }

      if (pending.length === 0) {
        observer?.resume();
        return;
      }

      try {
        const res = await translateBatch(pending.map((p) => p.item));

        res.translations.forEach((translated, i) => {
          const p = pending[i];
          if (!p) return;

          const extracted = extractPlainText(translated);
          if (extracted.kind !== "ok") return;

          const safe = sanitizeUiTranslation(p.original.text, extracted.text);

          if (p.original.kind === "text") {
            preMarkTranslated(p.original);
            p.original.node.textContent = safe;
            markTranslated(p.original);
          } else {
            p.original.el.setAttribute("placeholder", safe);
            markTranslated(p.original);
          }

          translatedStrings.add(p.key);
        });
      } finally {
        for (const p of pending) {
          inFlightStrings.delete(p.key);
        }
        observer?.resume();
      }
    },
  );

  observer = startDomTextObserver((s) => batcher.push(s));

  return () => {
    observer?.stop();
    observer = null;
    inFlightStrings.clear();
    translatedStrings.clear();
  };
}
