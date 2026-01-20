export type ExtractResult =
  | { kind: "ok"; text: string }
  | { kind: "toolcall"; raw: string }
  | { kind: "empty"; raw: string };

export function extractPlainText(output: string): ExtractResult {
  const trimmed = output.trim();

  // Tool-call JSON (model didn't return final answer)
  if (trimmed.startsWith("{") && trimmed.includes('"name"')) {
    return { kind: "toolcall", raw: trimmed };
  }

  // If backend returns a JSON string like: "Su di lui"
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const unquoted = trimmed.slice(1, -1).trim();
    if (!unquoted) return { kind: "empty", raw: trimmed };
    return { kind: "ok", text: unquoted };
  }

  if (!trimmed) return { kind: "empty", raw: output };
  return { kind: "ok", text: trimmed };
}
