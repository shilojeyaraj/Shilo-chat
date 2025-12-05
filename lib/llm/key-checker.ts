/**
 * Check which API keys are available
 * This allows the system to only use providers that are configured
 */

export interface AvailableProviders {
  groq: boolean;
  perplexity: boolean;
  kimi: boolean;
  anthropic: boolean;
  openai: boolean;
  gemini: boolean;
  openrouter: boolean;
}

/**
 * Check which providers have API keys configured
 */
export function getAvailableProviders(): AvailableProviders {
  return {
    groq: !!process.env.GROQ_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    kimi: !!process.env.KIMI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    openrouter: !!process.env.OPEN_ROUTER_KEY,
  };
}

/**
 * Get the best available provider for a task type
 * Falls back to available providers if preferred one isn't available
 */
export function getBestAvailableProvider(
  preferred: 'groq' | 'perplexity' | 'kimi' | 'anthropic' | 'openai' | 'gemini' | 'openrouter',
  available: AvailableProviders
): 'groq' | 'perplexity' | 'kimi' | 'anthropic' | 'openai' | 'gemini' | 'openrouter' | null {
  // If preferred is available, use it
  if (available[preferred]) {
    return preferred;
  }

  // Fallback priority order
  const fallbackOrder: Array<'groq' | 'perplexity' | 'kimi' | 'anthropic' | 'openai' | 'gemini' | 'openrouter'> = [
    'openrouter', // If OpenRouter is available, prefer it (unified access to all models)
    'groq',      // Cheapest, fastest
    'kimi',      // Great quality, good pricing (Kimi K2)
    'gemini',    // Best for vision, good quality, free tier
    'openai',    // Good vision, good quality
    'anthropic', // Good quality, moderate cost
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

