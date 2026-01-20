import type { PropsWithChildren } from "react";

/**
 * Marks a subtree as NOT translatable by the DOM observer.
 * This is the official escape hatch for the translation system.
 */
export function NoTranslate({ children }: PropsWithChildren) {
  return <span data-no-translate>{children}</span>;
}
