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

let translatedTextNodes = new WeakSet<Text>();
let translatedPlaceholderEls = new WeakSet<
  HTMLInputElement | HTMLTextAreaElement
>();

export function preMarkTranslated(s: UiString) {
  if (s.kind === "text") {
    translatedTextNodes.add(s.node);
  }
}

export function markTranslated(s: UiString) {
  if (s.kind === "text") translatedTextNodes.add(s.node);
  else translatedPlaceholderEls.add(s.el);
}

function isTranslatableText(raw: string) {
  const t = raw.trim();
  if (!t) return false;
  if (t.length === 1) return false;
  if (/^[\p{P}\p{S}]+$/u.test(t)) return false;
  return true;
}

export function startDomTextObserver(onDetected: (s: UiString) => void) {
  let enabled = true;

  function pause() {
    enabled = false;
  }
  function resume() {
    enabled = true;
  }

  function shouldIgnoreElement(el: Element) {
    if (!el.closest("main")) return true;
    if (el.closest("header, nav, footer")) return true;
    if (el.closest("[data-no-translate]")) return true;
    return false;
  }

  function emitTextNode(textNode: Text) {
    if (!enabled) return;
    if (translatedTextNodes.has(textNode)) return;

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

  function emitPlaceholder(el: HTMLInputElement | HTMLTextAreaElement) {
    if (!enabled) return;
    if (translatedPlaceholderEls.has(el)) return;
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

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder"],
  });

  walk(document.body);

  return {
    stop: () => observer.disconnect(),
    pause,
    resume,
  };
}

export function resetTranslatedState() {
  // WeakSets cannot be cleared, so we re-create them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (translatedTextNodes as any) = new WeakSet<Text>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (translatedPlaceholderEls as any) = new WeakSet<
    HTMLInputElement | HTMLTextAreaElement
  >();
}
