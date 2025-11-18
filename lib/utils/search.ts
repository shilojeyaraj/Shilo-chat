import { db, DocumentChunk } from '@/lib/db';
import { generateEmbedding } from './embeddings';

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search for relevant document chunks using semantic search
 * @param query - The search query
 * @param limit - Maximum number of results to return
 * @param threshold - Minimum similarity threshold (0-1)
 */
export async function searchRelevantChunks(
  query: string,
  limit: number = 5,
  threshold: number = 0.5
): Promise<DocumentChunk[]> {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Get all chunks from database
  const allChunks = await db.chunks.toArray();

  if (allChunks.length === 0) {
    return [];
  }

  // Calculate similarities
  const similarities = allChunks.map((chunk) => ({
    chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // Filter by threshold and sort by similarity
  const relevant = similarities
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((item) => item.chunk);

  return relevant;
}

/**
 * Get chunks by document ID
 */
export async function getChunksByDocumentId(documentId: string): Promise<DocumentChunk[]> {
  return db.chunks.where('documentId').equals(documentId).toArray();
}

