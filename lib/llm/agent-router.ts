/**
 * Agent-Specific LLM Routing
 * 
 * Routes requests to optimal LLM models based on agent type rather than just task type.
 * This ensures each specialized agent uses the best model for its specific purpose.
 * 
 * Agent Types:
 * - chat: General conversation, research, Q&A
 * - resume: Resume optimization for job applications
 * - cover-letter: Cover letter optimization
 * - extract: Personal information extraction from documents
 * - code: Coding assistance and pair programming
 * - study: Educational learning coach (EELC)
 */

import { ModelConfig } from './router';
import { getOpenRouterModelId } from './openrouter-models';
import { TaskType } from './router';

export type AgentType = 
  | 'chat' 
  | 'resume' 
  | 'cover-letter' 
  | 'extract' 
  | 'code' 
  | 'study';

export interface AgentRoutingContext {
  taskType?: TaskType;
  hasImages?: boolean;
  hasCode?: boolean;
  fileCount?: number;
  complexity?: number; // 0-1 scale for coding tasks
  deepWebSearch?: boolean; // Force Perplexity for research
}

/**
 * Optimal LLM assignments per agent type:
 * 
 * - Chat Agent → Perplexity Pro (research) or Claude Sonnet 4.5 (reasoning)
 * - Resume Optimization → Claude Sonnet 4.5 (superior reasoning, structured output)
 * - Cover Letter Optimization → Claude Sonnet 4.5 (nuanced writing, tone adaptation)
 * - Personal Info Extraction → GPT-4o (fast multimodal, structured JSON)
 * - Coding Mode → Claude Opus 4.1 (complex) or Sonnet 4.5 (most tasks)
 * - Study Mode (EELC) → Claude Sonnet 4.5 (patient explanation, adaptive teaching)
 */
export function routeAgentToOptimalLLM(
  agentType: AgentType,
  context: AgentRoutingContext = {}
): ModelConfig {
  // All routing goes through OpenRouter for unified access
  const baseConfig = {
    provider: 'openrouter' as const,
  };

  switch (agentType) {
    case 'chat': {
      // Chat agent: Perplexity Pro for research, Claude Sonnet 4.5 for reasoning
      const isResearch = 
        context.deepWebSearch ||
        context.taskType === 'web_search' ||
        context.taskType === 'deep_research' ||
        (context.taskType === 'general' && context.deepWebSearch);

      if (isResearch) {
        // Use Perplexity Pro Search for deep research, Sonar Pro for web search
        const isDeepResearch = context.taskType === 'deep_research';
        return {
          ...baseConfig,
          model: isDeepResearch 
            ? getOpenRouterModelId('perplexity/sonar-pro-search')
            : getOpenRouterModelId('perplexity/sonar-pro'),
          maxTokens: isDeepResearch ? 8192 : 4096,
          temperature: isDeepResearch ? 0.3 : 0.7,
          costPer1M: isDeepResearch ? 15 : 1, // Perplexity Pro Search is more expensive
        };
      }

      // Default to Claude Sonnet 4.5 for general chat and reasoning
      return {
        ...baseConfig,
        model: getOpenRouterModelId('claude-3-5-sonnet-20241022'),
        maxTokens: 8192,
        temperature: 0.7,
        costPer1M: 3,
      };
    }

    case 'resume': {
      // Resume optimization: Claude Sonnet 4.5 (best reasoning, structured output)
      return {
        ...baseConfig,
        model: getOpenRouterModelId('claude-3-5-sonnet-20241022'),
        maxTokens: 8192,
        temperature: 0.3, // Lower temp for more precise, structured output
        costPer1M: 3,
      };
    }

    case 'cover-letter': {
      // Cover letter optimization: Claude Sonnet 4.5 (nuanced writing, tone adaptation)
      return {
        ...baseConfig,
        model: getOpenRouterModelId('claude-3-5-sonnet-20241022'),
        maxTokens: 8192,
        temperature: 0.7, // Higher temp for more natural, varied writing
        costPer1M: 3,
      };
    }

    case 'extract': {
      // Personal info extraction: GPT-4o (fast multimodal, excellent structured output)
      return {
        ...baseConfig,
        model: getOpenRouterModelId('gpt-4o'),
        maxTokens: 4096,
        temperature: 0.1, // Very low temp for accurate extraction
        costPer1M: 2.5, // GPT-4o pricing
      };
    }

    case 'code': {
      // Coding mode: Claude Opus 4.1 for complex tasks, Sonnet 4.5 for most
      // Complexity threshold: 0.7 (70% complexity) → use Opus
      const useOpus = (context.complexity ?? 0) > 0.7;

      if (useOpus) {
        // Complex coding tasks: Claude Opus 4 (world's best coding model)
        return {
          ...baseConfig,
          model: getOpenRouterModelId('claude-opus-4.1'), // Maps to anthropic/claude-opus-4
          maxTokens: 8192,
          temperature: 0.3,
          costPer1M: 15, // Opus pricing
        };
      }

      // Most coding tasks: Claude Sonnet 4.5 (excellent quality, better cost)
      return {
        ...baseConfig,
        model: getOpenRouterModelId('claude-3-5-sonnet-20241022'),
        maxTokens: 8192,
        temperature: 0.3,
        costPer1M: 3,
      };
    }

    case 'study': {
      // Study mode (EELC): Claude Sonnet 4.5 (patient explanation, adaptive teaching)
      return {
        ...baseConfig,
        model: getOpenRouterModelId('claude-3-5-sonnet-20241022'),
        maxTokens: 8192,
        temperature: 0.7, // Balanced for natural teaching style
        costPer1M: 3,
      };
    }

    default: {
      // Fallback: Claude Sonnet 4.5
      return {
        ...baseConfig,
        model: getOpenRouterModelId('claude-3-5-sonnet-20241022'),
        maxTokens: 4096,
        temperature: 0.7,
        costPer1M: 3,
      };
    }
  }
}

/**
 * Get fallback chain for an agent type
 * Used when primary LLM fails or is unavailable
 */
export function getAgentFallbackChain(agentType: AgentType): ModelConfig[] {
  const fallbacks: Record<AgentType, ModelConfig[]> = {
    chat: [
      routeAgentToOptimalLLM('chat', { taskType: 'general' }), // Claude Sonnet
      {
        provider: 'openrouter',
        model: getOpenRouterModelId('gpt-4o'),
        maxTokens: 4096,
        temperature: 0.7,
        costPer1M: 2.5,
      },
    ],
    resume: [
      routeAgentToOptimalLLM('resume'), // Claude Sonnet
      {
        provider: 'openrouter',
        model: getOpenRouterModelId('gpt-4o'),
        maxTokens: 8192,
        temperature: 0.3,
        costPer1M: 2.5,
      },
    ],
    'cover-letter': [
      routeAgentToOptimalLLM('cover-letter'), // Claude Sonnet
      {
        provider: 'openrouter',
        model: getOpenRouterModelId('gpt-4o'),
        maxTokens: 8192,
        temperature: 0.7,
        costPer1M: 2.5,
      },
    ],
    extract: [
      routeAgentToOptimalLLM('extract'), // GPT-4o
      {
        provider: 'openrouter',
        model: getOpenRouterModelId('claude-3-5-sonnet-20241022'),
        maxTokens: 4096,
        temperature: 0.1,
        costPer1M: 3,
      },
    ],
    code: [
      routeAgentToOptimalLLM('code', { complexity: 0.5 }), // Claude Sonnet
      {
        provider: 'openrouter',
        model: getOpenRouterModelId('gpt-4o'),
        maxTokens: 8192,
        temperature: 0.3,
        costPer1M: 2.5,
      },
    ],
    study: [
      routeAgentToOptimalLLM('study'), // Claude Sonnet
      {
        provider: 'openrouter',
        model: getOpenRouterModelId('gpt-4o'),
        maxTokens: 8192,
        temperature: 0.7,
        costPer1M: 2.5,
      },
    ],
  };

  return fallbacks[agentType] || [routeAgentToOptimalLLM('chat')];
}

/**
 * Estimate complexity for coding tasks
 * Used to determine if Opus 4.1 is needed
 */
export function estimateCodingComplexity(
  message: string,
  hasCode: boolean,
  fileCount: number
): number {
  let complexity = 0;

  // Base complexity from message length and keywords
  if (message.length > 500) complexity += 0.2;
  if (message.length > 1500) complexity += 0.2;

  // Complex keywords
  const complexKeywords = [
    'architecture', 'refactor', 'multi-file', 'system design',
    'optimize performance', 'scalability', 'distributed', 'microservices',
    'database migration', 'legacy code', 'complex algorithm'
  ];
  const keywordMatches = complexKeywords.filter(kw => 
    message.toLowerCase().includes(kw.toLowerCase())
  ).length;
  complexity += keywordMatches * 0.1;

  // Multiple files indicate higher complexity
  if (fileCount > 3) complexity += 0.2;
  if (fileCount > 5) complexity += 0.2;

  // Code editing is typically more complex than generation
  if (hasCode && /refactor|debug|fix|optimize|improve/i.test(message)) {
    complexity += 0.2;
  }

  return Math.min(complexity, 1.0); // Cap at 1.0
}

