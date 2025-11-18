/**
 * Check which API keys are available
 * This allows the system to only use providers that are configured
 */

export interface AvailableProviders {
  groq: boolean;
  perplexity: boolean;
  openai: boolean;
  anthropic: boolean;
}

/**
 * Check which providers have API keys configured
 */
export function getAvailableProviders(): AvailableProviders {
  return {
    groq: !!process.env.GROQ_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  };
}

/**
 * Get the best available provider for a task type
 * Falls back to available providers if preferred one isn't available
 */
export function getBestAvailableProvider(
  preferred: 'groq' | 'perplexity' | 'openai' | 'anthropic',
  available: AvailableProviders
): 'groq' | 'perplexity' | 'openai' | 'anthropic' | null {
  // If preferred is available, use it
  if (available[preferred]) {
    return preferred;
  }

  // Fallback priority order
  const fallbackOrder: Array<'groq' | 'perplexity' | 'openai' | 'anthropic'> = [
    'groq',      // Cheapest, fastest
    'anthropic', // Good quality, moderate cost
    'openai',    // Best quality, expensive
    'perplexity', // Specialized for search
  ];

  // Find first available fallback
  for (const provider of fallbackOrder) {
    if (available[provider]) {
      return provider;
    }
  }

  return null; // No providers available
}

/**
 * Check if at least one provider is available
 */
export function hasAnyProvider(available: AvailableProviders): boolean {
  return Object.values(available).some((v) => v);
}

