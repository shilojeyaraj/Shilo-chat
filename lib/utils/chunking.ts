/**
 * Chunk text intelligently with overlap
 * @param text - The text to chunk
 * @param chunkSize - Target chunk size in tokens (approximate)
 * @param overlap - Overlap size in tokens (approximate)
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 100
): string[] {
  // Approximate tokens: 1 token ≈ 4 characters
  const charChunkSize = chunkSize * 4;
  const charOverlap = overlap * 4;

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + charChunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('. ');
      const lastNewline = chunk.lastIndexOf('\n\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > charChunkSize * 0.5) {
        chunk = text.slice(start, start + breakPoint + 1);
        start += breakPoint + 1 - charOverlap;
      } else {
        start += charChunkSize - charOverlap;
      }
    } else {
      start = text.length;
    }

    chunks.push(chunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

