import { Message } from './types';
import { getAvailableProviders, getBestAvailableProvider } from './key-checker';

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
  | 'general';

export interface ModelConfig {
  provider: 'groq' | 'kimi' | 'anthropic' | 'perplexity';
  model: string;
  maxTokens: number;
  temperature: number;
  costPer1M: number;
}

const ROUTING_TABLE: Record<TaskType, ModelConfig> = {
  web_search: {
    provider: 'perplexity',
    model: 'llama-3.1-sonar-large-128k-online',
    maxTokens: 4096,
    temperature: 0.7,
    costPer1M: 5,
  },
  deep_research: {
    provider: 'perplexity',
    model: 'llama-3.1-sonar-large-128k-online', // Perplexity's research model
    maxTokens: 8192, // More tokens for comprehensive research
    temperature: 0.3, // Lower temperature for more factual, comprehensive responses
    costPer1M: 5,
  },
  code_generation: {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 8192,
    temperature: 0.3,
    costPer1M: 0.27,
  },
  code_editing: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
    temperature: 0.5,
    costPer1M: 3,
  },
  reasoning: {
    provider: 'kimi',
    model: 'moonshot-v1-128k', // Kimi K2 - excellent reasoning
    maxTokens: 4096,
    temperature: 0.8,
    costPer1M: 1.2, // Kimi pricing is typically lower than OpenAI
  },
  quick_qa: {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    maxTokens: 2048,
    temperature: 0.7,
    costPer1M: 0.05,
  },
  creative_writing: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
    temperature: 1.0,
    costPer1M: 3,
  },
  data_analysis: {
    provider: 'kimi',
    model: 'moonshot-v1-128k', // Kimi K2 - great for data analysis
    maxTokens: 4096,
    temperature: 0.3,
    costPer1M: 1.2,
  },
  long_context: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
    temperature: 0.7,
    costPer1M: 3,
  },
  vision: {
    provider: 'kimi', // Kimi K2 supports vision
    model: 'moonshot-v1-128k', // Kimi K2 has excellent vision capabilities
    maxTokens: 4096,
    temperature: 0.7,
    costPer1M: 1.2, // Kimi pricing
  },
  general: {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 4096,
    temperature: 0.7,
    costPer1M: 0.27,
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
  provider: 'groq' | 'kimi' | 'anthropic' | 'perplexity'
): ModelConfig {
  const fallbacks: Record<string, ModelConfig> = {
    groq: {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 4096,
      temperature: 0.7,
      costPer1M: 0.27,
    },
    anthropic: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.7,
      costPer1M: 3,
    },
    kimi: {
      provider: 'kimi',
      model: 'moonshot-v1-128k', // Kimi K2
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
    mode?: 'primary' | 'coding'; // Chat mode
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

  // User can manually override
  if (context.userOverride) {
    const [provider, model] = context.userOverride.split('/');
    const overrideProvider = provider as 'groq' | 'kimi' | 'anthropic' | 'perplexity';
    
    // CRITICAL: Prevent using non-vision models with images
    if (context.hasImages && (overrideProvider === 'groq' || overrideProvider === 'perplexity')) {
      throw new Error(
        `Cannot use ${overrideProvider} with images. ` +
        `Please select Kimi K2, Claude 3.5 Sonnet, or another vision-capable model for image analysis.`
      );
    }
    
    // Check if override provider is available
    if (available[overrideProvider]) {
      return {
        config: {
          provider: overrideProvider,
          model: model || getFallbackConfig(overrideProvider).model,
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

  const taskType = await classifyTask(
    lastMessage,
    context.hasImages,
    context.hasCode,
    context.fileCount || 0,
    messages.length
  );

  // CRITICAL: If images are present, MUST use vision-capable model
  // Groq and Perplexity do NOT support images
  if (context.hasImages) {
    // Force vision-capable providers only
    const visionProviders = ['kimi', 'anthropic'] as const;
    const availableVision = visionProviders.find(p => available[p]);
    
    if (availableVision) {
      // Prefer Kimi K2 for vision (excellent quality and pricing), fallback to Claude
      const visionConfig: ModelConfig = availableVision === 'kimi'
        ? {
            provider: 'kimi',
            model: 'moonshot-v1-128k', // Kimi K2 has excellent vision
            maxTokens: 4096,
            temperature: 0.7,
            costPer1M: 1.2,
          }
        : {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            maxTokens: 4096,
            temperature: 0.7,
            costPer1M: 3,
          };
      
      return {
        config: visionConfig,
        taskType: 'vision',
      };
    } else {
      // No vision-capable provider available
      throw new Error(
        'Images detected but no vision-capable model available. ' +
        'Please add KIMI_API_KEY or ANTHROPIC_API_KEY to use image analysis.'
      );
    }
  }

  // In coding mode, prefer coding-optimized models
  if (context.mode === 'coding') {
    // Override routing for coding mode - prefer Claude for code tasks
    if (taskType === 'code_generation' || taskType === 'code_editing') {
      const codingConfig = {
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 8192,
        temperature: 0.3,
        costPer1M: 3,
      };
      
      // Check if Claude is available, otherwise fallback
      if (available.anthropic) {
        return {
          config: codingConfig,
          taskType,
        };
      } else {
        // Fallback to best available coding model
        const fallback = getBestAvailableProvider('anthropic', available);
        if (fallback) {
          return {
            config: getFallbackConfig(fallback),
            taskType,
          };
        }
      }
    }
  }

  const preferredConfig = ROUTING_TABLE[taskType];
  const config = getConfigWithFallback(preferredConfig, available);

  return {
    config,
    taskType,
  };
}

