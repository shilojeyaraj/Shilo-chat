/**
 * PDF parsing utilities
 */

/**
 * Parse PDF file and extract text (uses server-side API)
 */
export async function parsePDF(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/pdf/parse', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to parse PDF');
  }

  const data = await response.json();
  return data.text;
}

/**
 * Process PDF file: parse, chunk, and generate embeddings
 */
export async function processPDF(
  file: File,
  documentId: string
): Promise<{ chunks: string[]; embeddings: number[][] }> {
  // Parse PDF
  const text = await parsePDF(file);

  // Chunk text
  const { chunkText } = await import('./chunking');
  const chunks = chunkText(text, 500, 100);

  // Generate embeddings
  const { generateEmbeddings } = await import('./embeddings');
  const embeddings = await generateEmbeddings(chunks);

  return { chunks, embeddings };
}

