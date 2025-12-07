import { Message } from './types';
import { getAvailableProviders, getBestAvailableProvider } from './key-checker';
import { getOpenRouterModelId } from './openrouter-models';

export type TaskType =
  | 'web_search'
  | 'deep_research'
  | 'code_generation'
  | 'code_editing'
  | 'reasoning'
  | 'quick_qa'
  | 'creative_writing'
  | 'data_analysis'
  | 'long_context'
  | 'vision'
  | 'study'
  | 'general';

export interface ModelConfig {
  provider: 'groq' | 'kimi' | 'anthropic' | 'perplexity' | 'openai' | 'gemini' | 'openrouter';
  model: string;
  maxTokens: number;
  temperature: number;
  costPer1M: number;
}

const ROUTING_TABLE: Record<TaskType, ModelConfig> = {
  web_search: {
    provider: 'openrouter',
    model: 'perplexity/sonar', // Perplexity Sonar via OpenRouter
    maxTokens: 4096,
    temperature: 0.7,
    costPer1M: 0.2,
  },
  deep_research: {
    provider: 'openrouter',
    model: 'perplexity/sonar-pro-search', // Perplexity Pro Search for deep research via OpenRouter
    maxTokens: 8192, // More tokens for comprehensive research
    temperature: 0.3, // Lower temperature for more factual, comprehensive responses
    costPer1M: 15,
  },
  code_generation: {
    provider: 'openrouter',
    model: 'groq/llama-3.3-70b-versatile', // Groq via OpenRouter
    maxTokens: 8192,
    temperature: 0.3,
    costPer1M: 0.27,
  },
  code_editing: {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet', // Claude Sonnet 4.5 via OpenRouter
    maxTokens: 8192,
    temperature: 0.5,
    costPer1M: 3,
  },
  reasoning: {
    provider: 'openrouter',
    model: 'moonshotai/kimi-k2-turbo-preview', // Kimi K2 via OpenRouter
    maxTokens: 4096,
    temperature: 0.8,
    costPer1M: 1.2,
  },
  quick_qa: {
    provider: 'openrouter',
    model: 'groq/llama-3.1-8b-instant', // Groq via OpenRouter
    maxTokens: 2048,
    temperature: 0.7,
    costPer1M: 0.05,
  },
  creative_writing: {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet', // Claude Sonnet 4.5 via OpenRouter
    maxTokens: 8192,
    temperature: 1.0,
    costPer1M: 3,
  },
  data_analysis: {
    provider: 'openrouter',
    model: 'moonshotai/kimi-k2-turbo-preview', // Kimi K2 via OpenRouter
    maxTokens: 4096,
    temperature: 0.3,
    costPer1M: 1.2,
  },
  long_context: {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet', // Claude Sonnet 4.5 via OpenRouter
    maxTokens: 8192,
    temperature: 0.7,
    costPer1M: 3,
  },
  vision: {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-haiku', // Claude Haiku via OpenRouter (cheaper for vision)
    maxTokens: 4096,
    temperature: 0.7,
    costPer1M: 0.8, // Haiku: $0.80/1M input, $4/1M output
  },
  study: {
    provider: 'openrouter',
    model: 'moonshotai/kimi-k2-turbo-preview', // Kimi K2 via OpenRouter
    maxTokens: 8192,
    temperature: 0.7,
    costPer1M: 1.2,
  },
  general: {
    provider: 'openrouter',
    model: 'groq/llama-3.1-8b-instant', // Groq via OpenRouter (fast and cheap)
    maxTokens: 4096,
    temperature: 0.7,
    costPer1M: 0.05,
  },
};

export async function classifyTask(
  userMessage: string,
  hasImages: boolean = false,
  hasCode: boolean = false,
  fileCount: number = 0,
  conversationLength: number = 0
): Promise<TaskType> {
  // Fast rule-based detection (no API call needed)
  if (hasImages) return 'vision';
  if (fileCount > 3 || userMessage.length > 15000) return 'long_context';

  // Check for code editing
  if (hasCode && /fix|debug|refactor|improve|optimize|error|bug/i.test(userMessage)) {
    return 'code_editing';
  }

  // Check for code generation
  if (/write code|create|implement|build|function|class|component|generate code/i.test(userMessage)) {
    return 'code_generation';
  }

  // Check for deep research needs (comprehensive research queries)
  const researchKeywords = [
    'research', 'comprehensive', 'detailed analysis', 'deep dive', 'in-depth',
    'thorough', 'complete report', 'full analysis', 'extensive', 'investigate',
    'study', 'examine', 'explore', 'analyze in detail', 'comprehensive report'
  ];
  if (researchKeywords.some(kw => userMessage.toLowerCase().includes(kw)) || 
      (userMessage.length > 200 && /analyze|research|investigate|study|examine/i.test(userMessage))) {
    return 'deep_research';
  }

  // Check for web search needs
  const searchKeywords = [
    'search', 'look up', 'find', 'latest', 'current', 'news', 'today',
    'what is happening', 'recent', 'update', 'price of', 'weather', 'stock',
    'trending', 'happening now'
  ];
  if (searchKeywords.some(kw => userMessage.toLowerCase().includes(kw))) {
    return 'web_search';
  }

  // Check for creative writing
  if (/write|story|poem|essay|article|blog|creative|narrative/i.test(userMessage)) {
    return 'creative_writing';
  }

  // Check for data analysis
  if (/analyze|data|csv|chart|graph|statistics|calculate|dataset/i.test(userMessage)) {
    return 'data_analysis';
  }

  // Check for study-related queries
  const studyKeywords = [
    'study', 'learn', 'practice', 'review', 'exam', 'quiz', 'homework', 'assignment',
    'problem set', 'practice problems', 'study session', 'help me study', 'teach me',
    'explain concept', 'work through', 'solve problems', 'study guide', 'exam prep'
  ];
  if (studyKeywords.some(kw => userMessage.toLowerCase().includes(kw)) ||
      (/study|learn|practice|review/i.test(userMessage) && userMessage.length > 20)) {
    return 'study';
  }

  // Simple questions
  if (userMessage.length < 100 && /what is|who is|define|explain briefly/i.test(userMessage)) {
    return 'quick_qa';
  }

  // Complex reasoning
  if (/why|how does|compare|analyze|reasoning|logic|proof|theorem|explain why/i.test(userMessage)) {
    return 'reasoning';
  }

  // Default to general
  return 'general';
}

/**
 * Get fallback model config for a provider
 */
function getFallbackConfig(
  provider: 'groq' | 'kimi' | 'anthropic' | 'perplexity' | 'openai' | 'gemini' | 'openrouter'
): ModelConfig {
  const fallbacks: Record<string, ModelConfig> = {
    openrouter: {
      provider: 'openrouter',
      model: 'groq/llama-3.1-8b-instant', // Fast and cheap default
      maxTokens: 4096,
      temperature: 0.7,
      costPer1M: 0.05,
    },
    groq: {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 4096,
      temperature: 0.7,
      costPer1M: 0.27,
    },
    anthropic: {
      provider: 'anthropic',
      model: 'claude-3-5-haiku-20241022', // Use Haiku for cost savings (73% cheaper)
      maxTokens: 4096,
      temperature: 0.7,
      costPer1M: 0.8, // Haiku: $0.80/1M input, $4/1M output
    },
    openai: {
      provider: 'openai',
      model: 'gpt-4o',
      maxTokens: 4096,
      temperature: 0.7,
      costPer1M: 5,
    },
    gemini: {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      maxTokens: 8192,
      temperature: 0.7,
      costPer1M: 0.075,
    },
    kimi: {
      provider: 'kimi',
      model: 'kimi-k2-turbo-preview', // Kimi K2 - latest generation
      maxTokens: 4096,
      temperature: 0.7,
      costPer1M: 1.2,
    },
    perplexity: {
      provider: 'perplexity',
      model: 'llama-3.1-sonar-large-128k-online',
      maxTokens: 4096,
      temperature: 0.7,
      costPer1M: 5,
    },
  };
  return fallbacks[provider] || fallbacks.groq;
}

/**
 * Get model config with key availability check and fallback
 */
function getConfigWithFallback(
  preferredConfig: ModelConfig,
  available: ReturnType<typeof getAvailableProviders>
): ModelConfig {
  // If preferred provider is available, use it
  if (available[preferredConfig.provider]) {
    return preferredConfig;
  }

  // Find best available fallback
  const fallbackProvider = getBestAvailableProvider(preferredConfig.provider, available);
  if (fallbackProvider) {
    const fallback = getFallbackConfig(fallbackProvider);
    // Keep the task-specific settings but use available provider
    return {
      ...preferredConfig,
      provider: fallbackProvider,
      model: fallback.model,
      costPer1M: fallback.costPer1M,
    };
  }

  // Last resort: use Groq (should always be available if user has any keys)
  return getFallbackConfig('groq');
}

export async function routeRequest(
  messages: Message[],
  context: {
    hasImages?: boolean;
    hasCode?: boolean;
    fileCount?: number;
    userOverride?: string; // Manual model selection
    mode?: 'primary' | 'coding' | 'study'; // Chat mode
    deepWebSearch?: boolean; // Force Perplexity for web search/research
  } = {}
): Promise<{ config: ModelConfig; taskType: TaskType }> {
  // Extract text from last message (handle multimodal content)
  const lastMessageObj = messages[messages.length - 1];
  let lastMessage = '';
  if (lastMessageObj?.content) {
    if (typeof lastMessageObj.content === 'string') {
      lastMessage = lastMessageObj.content;
    } else if (Array.isArray(lastMessageObj.content)) {
      // Extract text from multimodal content
      const textPart = lastMessageObj.content.find((part: any) => part.type === 'text');
      lastMessage = textPart?.text || '';
    }
  }
  const available = getAvailableProviders();

  // OpenRouter is now the primary provider - require it
  if (!available.openrouter) {
    throw new Error(
      'OPEN_ROUTER_KEY is required. Please add it to your environment variables. ' +
      'OpenRouter provides unified access to all models (Anthropic, Kimi, Groq, Perplexity, OpenAI, etc.) ' +
      'with a single API key. Get your key at https://openrouter.ai'
    );
  }
  
  const useOpenRouter = true; // Always use OpenRouter when available

  let taskType = await classifyTask(
    lastMessage,
    context.hasImages,
    context.hasCode,
    context.fileCount || 0,
    messages.length
  );

  // User can manually override
  if (context.userOverride) {
    const [provider, model] = context.userOverride.split('/');
    const overrideProvider = provider as 'groq' | 'kimi' | 'anthropic' | 'perplexity' | 'openai' | 'gemini' | 'openrouter';
    
    // CRITICAL: Prevent using non-vision models with images or files
    // Kimi K2, Groq, and Perplexity do NOT support images/file extraction
    // Only Claude and OpenAI support vision
    if ((context.hasImages || (context.fileCount && context.fileCount > 0)) && 
        (overrideProvider === 'groq' || overrideProvider === 'perplexity' || overrideProvider === 'kimi' || overrideProvider === 'gemini')) {
      // Auto-switch to Claude Haiku (cheapest) or OpenAI for vision
      // Always use OpenRouter for vision tasks
      return {
        config: {
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-haiku', // OpenRouter model ID
          maxTokens: 4096,
          temperature: 0.7,
          costPer1M: 0.8,
        },
        taskType: context.hasImages ? 'vision' : 'long_context',
      };
    }
    
    // Check if override provider is available
    if (available[overrideProvider]) {
      let finalModel = model || getFallbackConfig(overrideProvider).model;
      
      // If using OpenRouter, convert model ID
      if (overrideProvider === 'openrouter' && model) {
        finalModel = getOpenRouterModelId(model);
      } else if (overrideProvider === 'openrouter' && !model) {
        // Get preferred config for task type
        const preferredConfig = ROUTING_TABLE[taskType];
        // Use default model for task type via OpenRouter
        finalModel = getOpenRouterModelId(preferredConfig.model);
      }
      
      return {
        config: {
          provider: overrideProvider,
          model: finalModel,
          maxTokens: 4096,
          temperature: 0.7,
          costPer1M: getFallbackConfig(overrideProvider).costPer1M,
        },
        taskType: context.hasImages ? 'vision' : 'general',
      };
    } else {
      // Fallback to best available
      const fallback = getBestAvailableProvider(overrideProvider, available);
      if (fallback) {
        return {
          config: getFallbackConfig(fallback),
          taskType: context.hasImages ? 'vision' : 'general',
        };
      }
    }
  }

  // If deep web search is enabled, force web_search or deep_research to use Perplexity
  if (context.deepWebSearch) {
    const searchKeywords = [
      'search', 'look up', 'find', 'latest', 'current', 'news', 'today',
      'what is happening', 'recent', 'update', 'price of', 'weather', 'stock',
      'trending', 'happening now', 'research', 'comprehensive', 'detailed analysis',
      'deep dive', 'in-depth', 'investigate', 'study', 'examine', 'explore'
    ];
    const isSearchOrResearch = searchKeywords.some(kw => lastMessage.toLowerCase().includes(kw)) ||
                               taskType === 'web_search' || taskType === 'deep_research';
    
    if (isSearchOrResearch) {
      // Use OpenRouter with Perplexity models for web search/research
      return {
        config: {
          provider: 'openrouter',
          model: taskType === 'deep_research' ? 'perplexity/sonar-pro-search' : 'perplexity/sonar',
          maxTokens: 8192,
          temperature: 0.3,
          costPer1M: 5,
        },
        taskType: taskType === 'deep_research' ? 'deep_research' : 'web_search',
      };
    }
  }

  // CRITICAL: If images or files are present, MUST use Claude via OpenRouter
  // Kimi K2, Groq, and Perplexity do NOT support images/file extraction
  // Claude 3.5 Sonnet is the preferred choice for vision tasks
  if (context.hasImages || (context.fileCount && context.fileCount > 0)) {
    const visionConfig: ModelConfig = {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet', // OpenRouter model ID
      maxTokens: 8192,
      temperature: 0.7,
      costPer1M: 3,
    };
    
    return {
      config: visionConfig,
      taskType: context.hasImages ? 'vision' : 'long_context',
    };
  }

  // In coding mode, prefer coding-optimized models
  if (context.mode === 'coding') {
    // Override routing for coding mode - prefer Claude for code tasks
    if (taskType === 'code_generation' || taskType === 'code_editing') {
      const codingConfig = {
        provider: 'openrouter' as const,
        model: 'anthropic/claude-3.5-sonnet', // OpenRouter model ID
        maxTokens: 8192,
        temperature: 0.3,
        costPer1M: 3,
      };
      
      return {
        config: codingConfig,
        taskType,
      };
    }
  }

  const preferredConfig = ROUTING_TABLE[taskType];
  
  // If OpenRouter is available, convert to OpenRouter model IDs
  let config = getConfigWithFallback(preferredConfig, available);
  
  if (useOpenRouter && available.openrouter) {
    // Convert to OpenRouter provider and model ID
    const openRouterModelId = getOpenRouterModelId(config.model);
    config = {
      ...config,
      provider: 'openrouter',
      model: openRouterModelId,
      // Keep same cost estimate (OpenRouter pricing is similar)
      costPer1M: config.costPer1M,
    };
  }
  
  // All routing now goes through OpenRouter - no direct provider fallbacks needed

  return {
    config,
    taskType,
  };
}

