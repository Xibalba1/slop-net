export function trimGeneratedText(value: string, limit: number) {
  const trimmed = value.trim();

  if (trimmed.length <= limit) {
    return trimmed;
  }

  const clipped = trimmed.slice(0, limit).trimEnd();
  const sentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("?"), clipped.lastIndexOf("!"));

  if (sentenceEnd >= Math.min(160, Math.floor(limit * 0.25))) {
    return clipped.slice(0, sentenceEnd + 1);
  }

  const wordBoundary = clipped.lastIndexOf(" ");

  if (wordBoundary >= Math.floor(limit * 0.7)) {
    return clipped.slice(0, wordBoundary).trimEnd();
  }

  return clipped;
}
