export const extractCode = (markdownText) => {
  const regex = /```[^\n]*\n([\s\S]*?)```/g;
  const matches = [...markdownText.matchAll(regex)];
  return matches.map(m => m[1].trim());
}
