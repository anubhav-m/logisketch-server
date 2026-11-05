// Returns the first fenced code block. If the model forgot the fences, fall back to
// the whole trimmed reply so Kroki still gets a chance to render it.
export const extractCode = (markdownText) => {
  if (typeof markdownText !== 'string') return undefined;
  const regex = /```[^\n]*\n([\s\S]*?)```/g;
  const matches = [...markdownText.matchAll(regex)];
  if (matches.length > 0) return matches[0][1].trim();
  const trimmed = markdownText.trim();
  return trimmed === '' ? undefined : trimmed;
}
