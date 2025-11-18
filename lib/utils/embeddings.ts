/**
 * Generate embeddings using OpenAI API
 * NOTE: Client-side embeddings (@xenova/transformers) removed due to webpack bundling issues
 * OpenAI API is required for embeddings (set OPENAI_API_KEY in .env.local)
 */

/**
 * Generate embeddings using OpenAI API
 * - Server-side: Calls OpenAI API directly (faster, no extra HTTP hop)
 * - Client-side: Calls our /api/embeddings endpoint (keeps API key secure)
 */
async function generateOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
  // Check if we're on the server (Node.js) or client (browser)
  const isServer = typeof window === 'undefined';

  if (isServer) {
    // Server-side: Call OpenAI API directly
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.statusText} - ${error}`);
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error('OpenAI embedding error (server-side):', error);
      throw error;
    }
  } else {
    // Client-side: Use our API endpoint (relative URL works in browser)
    try {
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texts }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embeddings;
    } catch (error) {
      console.error('OpenAI embedding error (client-side):', error);
      throw error;
    }
  }
}

/**
 * Client-side embeddings removed - use OpenAI API instead
 * This function is kept for API compatibility but always throws
 */
async function generateClientEmbeddings(texts: string[]): Promise<number[][]> {
  throw new Error(
    'Client-side embeddings are not available. Please configure OPENAI_API_KEY in .env.local for embeddings.'
  );
}

/**
 * Generate embeddings for texts using OpenAI API
 * OpenAI API key is required (set OPENAI_API_KEY in .env.local)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Use OpenAI API (required - no fallback)
  return await generateOpenAIEmbeddings(texts);
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = await generateEmbeddings([text]);
  return embeddings[0];
}

