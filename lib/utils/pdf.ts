/**
 * File parsing utilities - supports multiple formats
 */

export interface ParsedFile {
  text: string;
  pages?: number;
  info?: any;
  metadata?: any;
  isImage?: boolean;
  imageData?: string;
}

/**
 * Parse any supported file format and extract text (uses server-side API)
 * Supports: PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, JSON, images
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/files/parse', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to parse file');
  }

  const data = await response.json();
  return data;
}

/**
 * Process any file: parse, chunk, and generate embeddings
 * Supports: PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, JSON
 * Note: Images are handled separately (returned with isImage flag)
 */
export async function processFile(
  file: File,
  documentId: string
): Promise<{ chunks: string[]; embeddings: number[][]; isImage?: boolean; imageData?: string }> {
  // Parse file
  const parsed = await parseFile(file);

  // If it's an image, return early (no chunking/embeddings needed)
  if (parsed.isImage) {
    return {
      chunks: [],
      embeddings: [],
      isImage: true,
      imageData: parsed.imageData,
    };
  }

  // Chunk text
  const { chunkText } = await import('./chunking');
  const chunks = chunkText(parsed.text, 500, 100);

  // Generate embeddings
  const { generateEmbeddings } = await import('./embeddings');
  const embeddings = await generateEmbeddings(chunks);

  return { chunks, embeddings };
}

