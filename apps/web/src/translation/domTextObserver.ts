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

const TRANSLATION_LOCK = "__translation_locked__";

export function startDomTextObserver(onDetected: (s: UiString) => void) {
  let enabled = true;

  const observer = new MutationObserver((mutations) => {
    if (!enabled) return;

    for (const mutation of mutations) {
      mutation.addedNodes.forEach(walk);
    }
  });

  function pause() {
    enabled = false;
  }

  function resume() {
    enabled = true;
  }

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const parent = textNode.parentElement;
      const text = textNode.textContent?.trim();

      if (!parent || !text) return;
      if (!parent.closest("main")) return;
      if (parent.closest("header, nav, footer")) return;
      if (parent.dataset.__translated__) return;

      onDetected({
        id: crypto.randomUUID(),
        kind: "text",
        node: textNode,
        text,
        parent,
      });
      return;
    }

    node.childNodes.forEach(walk);
  }

  observer.observe(document.body, { childList: true, subtree: true });
  walk(document.body);

  return {
    stop: () => observer.disconnect(),
    pause,
    resume,
  };
}
