import { NextRequest, NextResponse } from 'next/server';
import { routeRequest } from '@/lib/llm/router';
import { providers } from '@/lib/llm/providers';
import { getAvailableProviders } from '@/lib/llm/key-checker';
import { detectRequiredTools, executeTools } from '@/lib/tools';
import { Message } from '@/lib/llm/types';
import { searchRelevantChunks } from '@/lib/utils/search';
import { getCodingPrompt } from '@/lib/prompts/coding-mode';
import { buildOptimizedContext, ConversationMessage } from '@/lib/utils/conversation-manager';
// Quality assessment removed - OpenRouter handles model selection
import type { ChatRequestBody, RAGChunk, FileData, ToolResult } from '@/lib/types/api';
import { routeAgentToOptimalLLM, estimateCodingComplexity } from '@/lib/llm/agent-router';
import { getChatAgentPrompt } from '@/lib/prompts/agent-prompts';

/**
 * Enhanced system prompt based on task type and mode
 */
function getSystemPrompt(
  taskType: string,
  mode: 'primary' | 'coding' | 'study' = 'primary',
  ragContext?: any[],
  toolResults?: Record<string, any>,
  personalInfoContext?: string,
  memoryContext?: string,
  studyProgress?: any,
  errorLog?: any[]
): string {
  // Study mode uses EELC prompts
  if (mode === 'study') {
    const { getStudyPrompt } = require('@/lib/prompts/study-mode');
    // Detect technique from user message or use default
    const technique = detectStudyTechnique(taskType);
    return getStudyPrompt(taskType, technique, ragContext, studyProgress, errorLog);
  }
  
  // Coding mode uses advanced prompts
  if (mode === 'coding') {
    return getCodingPrompt(taskType, ragContext, toolResults);
  }

  // Primary mode: Use optimized chat agent prompt
  // This will automatically use Perplexity Pro for research or Claude Sonnet 4.5 for reasoning
  let basePrompt = getChatAgentPrompt(taskType, ragContext, toolResults, personalInfoContext, memoryContext);

  // Add RAG context
  if (ragContext && ragContext.length > 0) {
    basePrompt += '\n\nRelevant context from uploaded documents:\n';
    ragContext.forEach((chunk: any, index: number) => {
      basePrompt += `\n[Document ${index + 1}: ${chunk.documentName}]\n${chunk.text}\n`;
    });
  }

  // Add tool results
  if (toolResults && Object.keys(toolResults).length > 0) {
    basePrompt += '\n\n[Tool Results]:\n';
    basePrompt += JSON.stringify(toolResults, null, 2);
  }

  // Add personal information context
  if (personalInfoContext) {
    basePrompt += personalInfoContext;
  }

  // Add memory context (persistent facts across conversations)
  if (memoryContext) {
    basePrompt += memoryContext;
  }

  // Task-specific prompts
  switch (taskType) {
    case 'deep_research':
      basePrompt += '\n\nCRITICAL FOR DEEP RESEARCH:\n';
      basePrompt += '- Conduct comprehensive, thorough research\n';
      basePrompt += '- Use multiple sources and perspectives\n';
      basePrompt += '- Provide detailed analysis with citations\n';
      basePrompt += '- Include background context and related information\n';
      basePrompt += '- Structure the response as a comprehensive report\n';
      break;
    case 'code_generation':
      basePrompt += '\n\nCRITICAL FOR CODE GENERATION:\n';
      basePrompt += '- ALWAYS make code immediately runnable\n';
      basePrompt += '- Add all imports, dependencies, error handling\n';
      basePrompt += '- For React components, ensure they\'re self-contained\n';
      break;
    case 'code_editing':
      basePrompt += '\n\nCRITICAL FOR CODE EDITING:\n';
      basePrompt += '- Understand the existing code structure\n';
      basePrompt += '- Make minimal, focused changes\n';
      basePrompt += '- Preserve existing functionality\n';
      break;
    case 'web_search':
      basePrompt += '\n\nCRITICAL FOR WEB SEARCH:\n';
      basePrompt += '- Use the search results provided\n';
      basePrompt += '- Cite sources when referencing information\n';
      basePrompt += '- Distinguish between facts and opinions\n';
      break;
  }

  return basePrompt;
}

/**
 * Detect study technique from task type or message content
 */
function detectStudyTechnique(taskType: string): string | undefined {
  // Map task types to study techniques
  if (taskType === 'study') {
    // Default technique - can be refined based on message content
    return undefined; // Will use default from main prompt
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const {
      messages,
      files = [],
      userOverride,
      useRAG = false,
      mode = 'primary',
      deepWebSearch = false,
      personalInfoContext,
      memoryContext,
    } = body;

    // Extract text content from last message (handle multimodal)
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

    // Step 1: Detect required tools
    const requiredTools = await detectRequiredTools(lastMessage, files);

    // Step 2: Execute tools if needed
    let toolResults: ToolResult = {};
    if (requiredTools.length > 0) {
      // Prepare file data for tools
      const fileData: FileData[] = files.map((f) => ({
        ...f,
        data: f.data || f.content, // Support both formats
      }));

      toolResults = await executeTools(requiredTools, {
        userMessage: lastMessage,
        files: fileData,
      });
    }

    // Step 3: Get RAG context if enabled
    let ragContext: RAGChunk[] = [];
    if (useRAG) {
      try {
        const relevantChunks = await searchRelevantChunks(lastMessage, 5, 0.5);
        ragContext = relevantChunks.map((chunk) => ({
          documentName: chunk.documentName,
          text: chunk.text,
        }));
      } catch (error) {
        // Continue without RAG if it fails
        // Error logged silently to avoid cluttering logs
      }
    }

    // personalInfoContext and memoryContext are already extracted from body above

    // Early check: If images/files are present, verify Claude (preferred) or OpenAI is available
    // Check both files array and message content for images
    const hasImagesInFiles = files.some((f: any) => f.type?.startsWith('image/'));
    const hasImagesInMessages = messages.some((m: any) => {
      if (Array.isArray(m.content)) {
        return m.content.some((part: any) => part.type === 'image_url' || part.type === 'image');
      }
      return false;
    });
    const hasImages = hasImagesInFiles || hasImagesInMessages;
    const fileCount = files.length;
    const available = getAvailableProviders();
    
    // OpenRouter is required and handles all models including vision
    if ((hasImages || fileCount > 0) && !available.openrouter) {
      return NextResponse.json(
        {
          error: 'OPEN_ROUTER_KEY required for image/file analysis',
          details: 'Images or files were detected, but OPEN_ROUTER_KEY is not configured. OpenRouter provides access to Claude and OpenAI models for vision tasks. Please add OPEN_ROUTER_KEY to your Vercel environment variables.',
          requiresVision: true,
        },
        { status: 400 }
      );
    }

    // Step 4: Classify task type first
    const { taskType: classifiedTaskType } = await routeRequest(messages, {
      hasImages,
      hasCode: /```/.test(lastMessage),
      fileCount,
      userOverride,
      mode,
      deepWebSearch,
    });
    
    // Step 4.5: Use agent-specific routing for chat agent
    // This ensures we use Perplexity Pro for research or Claude Sonnet 4.5 for reasoning
    const taskType = classifiedTaskType;
    const codingComplexity = mode === 'coding' 
      ? estimateCodingComplexity(lastMessage, /```/.test(lastMessage), fileCount)
      : undefined;
    
    const agentConfig = routeAgentToOptimalLLM('chat', {
      taskType,
      hasImages,
      hasCode: /```/.test(lastMessage),
      fileCount,
      deepWebSearch,
    });
    
    // Use agent config, but allow user override
    const config = userOverride ? (await routeRequest(messages, {
      hasImages,
      hasCode: /```/.test(lastMessage),
      fileCount,
      userOverride,
      mode,
      deepWebSearch,
    })).config : agentConfig;

    // Step 5: Optimize conversation context (hot-warm-cold)
    const conversationMessages: ConversationMessage[] = messages.map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      timestamp: m.timestamp || Date.now(),
      images: m.images,
    }));

    // Build optimized context (hot-warm-cold management)
    // For vision tasks with images, adjust context based on provider
    // Claude handles large images well, OpenAI has stricter limits
    let contextMaxTokens: number;
    if (hasImages) {
      if (config.provider === 'anthropic') {
        // Claude handles large images well - can use more context
        contextMaxTokens = Math.min(6000, config.maxTokens * 0.5);
      } else {
        // OpenAI - be very conservative (images are huge in base64)
        contextMaxTokens = Math.min(4000, config.maxTokens * 0.3);
      }
    } else {
      // Normal context for text-only
      contextMaxTokens = config.maxTokens * 0.8;
    }
    
    const optimizedMessages = buildOptimizedContext(
      conversationMessages,
      contextMaxTokens
    );

    // Step 6: Build enhanced messages with system prompt and handle images
    // Use optimized agent prompts for better performance
    const studyProgress = mode === 'study' ? undefined : undefined;
    const errorLog = mode === 'study' ? undefined : undefined;
    
    // Use agent-specific prompts (optimized for each LLM)
    let systemPrompt: string;
    if (mode === 'study') {
      // Study mode uses EELC prompts
      const { getStudyPrompt } = require('@/lib/prompts/study-mode');
      const technique = detectStudyTechnique(taskType);
      systemPrompt = getStudyPrompt(taskType, technique, ragContext, studyProgress, errorLog);
    } else if (mode === 'coding') {
      // Coding mode uses optimized coding prompts
      const { getCodingModePrompt } = require('@/lib/prompts/agent-prompts');
      systemPrompt = getCodingModePrompt(taskType, ragContext, toolResults);
    } else {
      // Primary mode: Use optimized chat agent prompt
      systemPrompt = getChatAgentPrompt(taskType, ragContext, toolResults, personalInfoContext, memoryContext);
    }
    
    // Truncate system prompt if it's too large (especially with images)
    // Claude handles large images well, so we can keep more context
    if (hasImages) {
      if (config.provider === 'anthropic') {
        // Claude - can handle larger system prompts
        if (systemPrompt.length > 3000) {
          systemPrompt = systemPrompt.substring(0, 3000) + '... [truncated for image processing]';
          // System prompt truncated for Claude image processing
        }
      } else {
        // OpenAI - be more conservative
        if (systemPrompt.length > 2000) {
          systemPrompt = systemPrompt.substring(0, 2000) + '... [truncated for image processing]';
          // System prompt truncated for OpenAI image processing
        }
      }
    }
    
    // Convert optimized messages to proper format with images
    // Filter out system messages from optimized (we add our own)
    const userMessages = optimizedMessages.filter((m: any) => m.role !== 'system');
    
    // Limit message history based on provider when images are present
    // Claude handles large images well, OpenAI needs stricter limits
    let finalMessages = userMessages;
    if (hasImages) {
      if (config.provider === 'openai') {
        // OpenAI - be very conservative (images are huge in base64)
        finalMessages = userMessages.slice(-5);
        // Limiting to last N messages for OpenAI image processing
      } else if (config.provider === 'anthropic') {
        // Claude - can handle more context with images
        finalMessages = userMessages.slice(-8);
        // Limiting to last N messages for Claude image processing
      }
    }
    
    const enhancedMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...finalMessages
        .map((m: any): Message | null => {
          // Skip compressed messages that are just placeholders
          if (m.content && typeof m.content === 'string' && m.content.includes('[compressed]') && m.content.length < 50) {
            // Skip very short compressed messages
            return null;
          }
          
          // If message has images, format for vision models
          if (m.images && m.images.length > 0) {
            const contentParts: any[] = [];
            
            // Add text content if present
            if (m.content && typeof m.content === 'string' && m.content.trim()) {
              contentParts.push({ type: 'text', text: m.content });
            }
            
            // Add images - ensure proper base64 data URL format
            m.images.forEach((img: string) => {
              if (img && img.trim()) {
                // Ensure image is in proper data URL format
                let imageUrl = img;
                
                // If it's not already a data URL, make it one
                if (!imageUrl.startsWith('data:')) {
                  // Try to detect if it's base64 without prefix
                  if (!imageUrl.includes('://')) {
                    // Assume PNG if no MIME type detected
                    imageUrl = `data:image/png;base64,${imageUrl}`;
                  }
                }
                
                // Validate the format
                if (imageUrl.startsWith('data:image/')) {
                  contentParts.push({
                    type: 'image_url',
                    image_url: {
                      url: imageUrl,
                    },
                  });
                } else {
                  // Invalid image format, skipping
                }
              }
            });
            
            // Ensure we have at least text or image
            if (contentParts.length === 0) {
              return null; // Skip messages with no valid content
            }
            
            return {
              role: m.role,
              content: contentParts,
            };
          }
          
          // Regular text message - ensure it's not empty
          const textContent = typeof m.content === 'string' ? m.content.trim() : '';
          if (!textContent) {
            return null; // Skip empty messages
          }
          
          return {
            role: m.role,
            content: textContent,
          };
        })
        .filter((m): m is Message => m !== null), // Remove null entries with type guard
    ];

    // Step 7: Use the provider from router (always OpenRouter now)
    // Quality-based fallback removed - OpenRouter handles model selection
    const finalConfig = config;
    const finalProvider = providers[config.provider];
    const usedFallback = false; // No fallback needed with OpenRouter

    // Validate final provider
    if (!finalProvider) {
      return NextResponse.json(
        { error: `Provider ${finalConfig.provider} not found` },
        { status: 400 }
      );
    }

    // Check if provider is available (has API key)
    if (!finalProvider.isAvailable()) {
      return NextResponse.json(
        { 
          error: `Provider ${finalConfig.provider} is not configured. Please add ${finalConfig.provider.toUpperCase()}_API_KEY to your environment variables.`,
          availableProviders: Object.entries(providers)
            .filter(([_, p]) => p.isAvailable())
            .map(([key, _]) => key)
        },
        { status: 400 }
      );
    }

    // Create readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata first
          const metadata = {
            type: 'metadata',
            taskType,
            model: finalConfig.model,
            provider: finalConfig.provider,
            providerName: finalProvider.name,
            toolsUsed: requiredTools,
            costPer1M: finalConfig.costPer1M,
            usedFallback: false, // OpenRouter handles routing, no fallback needed
            fallbackReason: undefined,
          };
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(metadata)}\n\n`)
          );

          // Stream the response from OpenRouter
          let usageData: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null = null;
          
          for await (const chunk of finalProvider.streamCall(enhancedMessages, {
            model: finalConfig.model,
            temperature: finalConfig.temperature,
            maxTokens: finalConfig.maxTokens,
            stream: true,
          })) {
            // Check if chunk contains usage data (some providers send it)
            if (chunk && typeof chunk === 'object' && 'usage' in chunk) {
              usageData = (chunk as any).usage;
              continue; // Skip usage data chunks, they're not content
            }
            
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`
              )
            );
          }

          // Send usage data if available
          if (usageData) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'usage', usage: usageData })}\n\n`
              )
            );
          }

          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          // Streaming error handled
          // Send error to client before closing
          const errorMessage = error?.message || String(error);
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    // Chat API error handled
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
