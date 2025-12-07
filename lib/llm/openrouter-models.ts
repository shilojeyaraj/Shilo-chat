/**
 * OpenRouter Model ID Mapping
 * Maps our internal model names to OpenRouter model IDs
 */
export const OPENROUTER_MODEL_MAP: Record<string, string> = {
  // Anthropic Claude models (latest versions)
  'claude-3-5-sonnet-20240620': 'anthropic/claude-3.5-sonnet',
  'claude-3-5-sonnet-20241022': 'anthropic/claude-3.5-sonnet', // Latest Sonnet 4.5
  'claude-3-5-haiku-20241022': 'anthropic/claude-3.5-haiku',
  'claude-opus-4.1': 'anthropic/claude-opus-4', // Claude Opus 4.1 for complex coding
  'claude-sonnet-4.5': 'anthropic/claude-3.5-sonnet', // Alias for latest Sonnet
  
  // Kimi/Moonshot models
  'kimi-k2-turbo-preview': 'moonshotai/kimi-k2-turbo-preview',
  'kimi-k2-0905-preview': 'moonshotai/kimi-k2-0905-preview',
  
  // Perplexity models (Pro subscription models)
  'llama-3.1-sonar-large-128k-online': 'perplexity/sonar',
  'perplexity/sonar': 'perplexity/sonar', // Standard Sonar
  'perplexity/sonar-pro': 'perplexity/sonar-pro', // Pro subscription model
  'sonar-pro': 'perplexity/sonar-pro', // Alias
  'sonar-pro-search': 'perplexity/sonar-pro-search', // Deep research mode
  'perplexity/sonar-pro-search': 'perplexity/sonar-pro-search', // Deep research
  
  // OpenAI models
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  
  // Groq models (via OpenRouter)
  'llama-3.3-70b-versatile': 'groq/llama-3.3-70b-versatile',
  'llama-3.1-8b-instant': 'groq/llama-3.1-8b-instant',
  
  // Gemini models
  'gemini-2.0-flash-exp': 'google/gemini-2.0-flash-exp:free', // Free tier available
};

/**
 * Convert internal model name to OpenRouter model ID
 */
export function getOpenRouterModelId(internalModel: string): string {
  return OPENROUTER_MODEL_MAP[internalModel] || internalModel;
}

/**
 * Get pricing info for OpenRouter models (approximate, for display)
 * These are based on OpenRouter's pricing catalog
 */
export const OPENROUTER_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic Claude models
  'anthropic/claude-3.5-sonnet': { input: 3, output: 15 }, // Sonnet 4.5
  'anthropic/claude-3.5-haiku': { input: 0.8, output: 4 },
  'anthropic/claude-opus-4': { input: 15, output: 75 }, // Opus 4.1 for complex coding
  
  // Kimi/Moonshot models
  'moonshotai/kimi-k2-turbo-preview': { input: 1.2, output: 1.2 },
  
  // Perplexity models
  'perplexity/sonar': { input: 0.2, output: 1 },
  'perplexity/sonar-pro': { input: 1, output: 1 }, // Pro subscription model
  'perplexity/sonar-pro-search': { input: 5, output: 15 }, // Deep research mode
  
  // OpenAI models
  'openai/gpt-4o': { input: 2.5, output: 10 }, // Best for multimodal extraction
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  
  // Groq models
  'groq/llama-3.3-70b-versatile': { input: 0.27, output: 0.27 },
  'groq/llama-3.1-8b-instant': { input: 0.05, output: 0.05 },
  
  // Gemini models
  'google/gemini-2.0-flash-exp:free': { input: 0, output: 0 }, // Free tier
};

/**
 * Calculate cost from usage data and model ID
 */
export function calculateOpenRouterCost(
  usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number },
  modelId: string
): number {
  const pricing = OPENROUTER_PRICING[modelId];
  if (!pricing) {
    // Fallback: use average pricing if model not in map
    return ((usage.totalTokens || 0) / 1_000_000) * 1.0; // $1/1M tokens average
  }
  
  const inputCost = ((usage.promptTokens || 0) / 1_000_000) * pricing.input;
  const outputCost = ((usage.completionTokens || 0) / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
}

