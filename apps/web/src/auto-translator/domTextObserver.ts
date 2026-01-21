/**
 * DOM text observer responsible for detecting translatable UI strings.
 *
 * This module scans the rendered DOM for visible text nodes and input placeholders,
 * emits them to the translation pipeline, and tracks which nodes have already been
 * translated to avoid repeated or stale updates.
 */

// Represents a unit of translatable UI content.
// Can be either a text node or an input/textarea placeholder.
export type UiString =
  | {
      id: string;
      kind: "text";
      node: Text;
      text: string;
      parent: HTMLElement;
    }
  | {
      id: string;
      kind: "placeholder";
      el: HTMLInputElement | HTMLTextAreaElement;
      text: string;
    };

type TranslatedMark = {
  lang: string;
  fingerprint: string;
};

// WeakMaps are used so that translated DOM nodes can be garbage-collected
// when removed from the document, avoiding memory leaks.
let translatedTextNodes = new WeakMap<Text, TranslatedMark>();
let translatedPlaceholderEls = new WeakMap<
  HTMLInputElement | HTMLTextAreaElement,
  TranslatedMark
>();

export function getTranslatedMark(s: UiString): TranslatedMark | undefined {
  if (s.kind === "text") return translatedTextNodes.get(s.node);
  return translatedPlaceholderEls.get(s.el);
}

export function preMarkTranslated(
  s: UiString,
  lang: string,
  fingerprint: string,
) {
  if (s.kind === "text") translatedTextNodes.set(s.node, { lang, fingerprint });
}

export function markTranslated(s: UiString, lang: string, fingerprint: string) {
  if (s.kind === "text") translatedTextNodes.set(s.node, { lang, fingerprint });
  else translatedPlaceholderEls.set(s.el, { lang, fingerprint });
}

// Filters out text that is not meaningful to translate (empty strings,
// single characters, or pure punctuation).
function isTranslatableText(raw: string) {
  const t = raw.trim();
  if (!t) return false;
  if (t.length === 1) return false;
  if (/^[\p{P}\p{S}]+$/u.test(t)) return false;
  return true;
}

/**
 * Starts observing the DOM for translatable content.
 *
 * The observer emits detected UI strings via the provided callback and
 * supports pausing/resuming to avoid feedback loops when applying translations.
 */
export function startDomTextObserver(onDetected: (s: UiString) => void) {
  let enabled = true;
  const root: Element = document.querySelector("main") ?? document.body;

  function pause() {
    enabled = false;
  }
  function resume() {
    enabled = true;
  }

  // Determines whether an element should be excluded from translation,
  // based on layout (header/nav/footer) or explicit opt-out attributes.
  function shouldIgnoreElement(el: Element) {
    if (!el.closest("main")) return true;
    if (el.closest("header, nav, footer")) return true;
    if (el.closest("[data-no-translate]")) return true;
    return false;
  }

  // Emits a text node for translation if it is eligible and not already processed.
  function emitTextNode(textNode: Text) {
    if (!enabled) return;
    if (translatedTextNodes.get(textNode)) return;

    const parent = textNode.parentElement;
    if (!parent) return;
    if (shouldIgnoreElement(parent)) return;

    const raw = textNode.textContent ?? "";
    if (!isTranslatableText(raw)) return;

    onDetected({
      id: crypto.randomUUID(),
      kind: "text",
      node: textNode,
      text: raw.trim(),
      parent,
    });
  }

  // Emits placeholder text from input or textarea elements.
  function emitPlaceholder(el: HTMLInputElement | HTMLTextAreaElement) {
    if (!enabled) return;
    if (translatedPlaceholderEls.get(el)) return;
    if (shouldIgnoreElement(el)) return;

    const ph = (el.getAttribute("placeholder") ?? "").trim();
    if (!ph) return;

    onDetected({
      id: crypto.randomUUID(),
      kind: "placeholder",
      el,
      text: ph,
    });
  }

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      emitTextNode(node as Text);
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        emitPlaceholder(el);
      }
    }

    node.childNodes.forEach(walk);
  }

  const observer = new MutationObserver((mutations) => {
    if (!enabled) return;

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(walk);
        continue;
      }
      if (mutation.type === "characterData") {
        emitTextNode(mutation.target as Text);
        continue;
      }
      if (mutation.type === "attributes") {
        const t = mutation.target;
        if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
          emitPlaceholder(t);
        }
      }
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder"],
  });

  // Performs the initial DOM scan in small time slices to avoid blocking
  // the main thread during first render.
  function initialScanChunked() {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    );

    const step = (deadline?: { timeRemaining?: () => number }) => {
      if (!enabled) return;

      const budgetMs =
        typeof deadline?.timeRemaining === "function"
          ? Math.min(12, deadline.timeRemaining())
          : 8;

      const endAt = performance.now() + Math.max(2, budgetMs);

      while (performance.now() < endAt) {
        const n = walker.nextNode();
        if (!n) return;

        if (n.nodeType === Node.TEXT_NODE) {
          emitTextNode(n as Text);
          continue;
        }

        if (n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement) {
          emitPlaceholder(n);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ric2: unknown = (window as any).requestIdleCallback;
      if (typeof ric2 === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ric2 as any)(step, { timeout: 500 });
      } else {
        setTimeout(() => step(), 0);
      }
    };

    step();
  }

  // Defer initial scan so first paint is not blocked.
  setTimeout(initialScanChunked, 0);

  return {
    stop: () => observer.disconnect(),
    pause,
    resume,
  };
}

// Clears all translation tracking state.
// WeakMaps cannot be cleared directly, so new instances are created.
export function resetTranslatedState() {
  // WeakMaps cannot be cleared, so we re-create them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (translatedTextNodes as any) = new WeakMap<Text, TranslatedMark>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (translatedPlaceholderEls as any) = new WeakMap<
    HTMLInputElement | HTMLTextAreaElement,
    TranslatedMark
  >();
}
