export function extractPlainText(output: string): string {
  const trimmed = output.trim();

  // Case 1: model returned JSON-like tool call
  if (trimmed.startsWith("{") && trimmed.includes('"name"')) {
    try {
      const parsed = JSON.parse(trimmed);

      // OpenAI-style function call
      if (parsed.parameters?.text) {
        return String(parsed.parameters.text).trim();
      }

      if (parsed.parameters?.source) {
        return String(parsed.parameters.source).trim();
      }
    } catch {
      // fall through
    }
  }

  // Case 2: already plain text
  return trimmed;
}
