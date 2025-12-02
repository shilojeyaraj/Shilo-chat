import { NextRequest, NextResponse } from 'next/server';
import { routeRequest } from '@/lib/llm/router';
import { providers } from '@/lib/llm/providers';
import { detectRequiredTools, executeTools } from '@/lib/tools';
import { Message } from '@/lib/llm/types';
import { searchRelevantChunks } from '@/lib/utils/search';
import { getCodingPrompt } from '@/lib/prompts/coding-mode';
import { buildOptimizedContext, ConversationMessage } from '@/lib/utils/conversation-manager';
// Personal info is now fetched on client side and passed in the request body
// Removed import since we no longer access IndexedDB from server

/**
 * Enhanced system prompt based on task type and mode
 */
function getSystemPrompt(
  taskType: string,
  mode: 'primary' | 'coding' = 'primary',
  ragContext?: any[],
  toolResults?: Record<string, any>,
  personalInfoContext?: string,
  memoryContext?: string
): string {
  // Coding mode uses advanced prompts
  if (mode === 'coding') {
    return getCodingPrompt(taskType, ragContext, toolResults);
  }

  // Primary mode (ChatGPT-like)
  let basePrompt = `You are a helpful AI assistant. You have access to:

- Web search (when you need current information)
- Code execution (Python sandbox)
- File parsing (PDFs, CSVs, images)
- Long context memory
- User's uploaded documents (via RAG)

When users ask for current info, you automatically search the web.
When users upload files, you automatically analyze them.
When users need code run, you automatically execute it in a sandbox.

Be conversational, helpful, and concise. Match ChatGPT's tone and quality.`;

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      files = [],
      userOverride,
      useRAG = false,
      mode = 'primary', // 'primary' or 'coding'
      deepWebSearch = false, // Force Perplexity for web search/research
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
    let toolResults: Record<string, any> = {};
    if (requiredTools.length > 0) {
      // Prepare file data for tools
      const fileData = files.map((f: any) => ({
        ...f,
        data: f.data || f.content, // Support both formats
      }));

      toolResults = await executeTools(requiredTools, {
        userMessage: lastMessage,
        files: fileData,
      });
    }

    // Step 3: Get RAG context if enabled
    let ragContext: any[] = [];
    if (useRAG) {
      try {
        const relevantChunks = await searchRelevantChunks(lastMessage, 5, 0.5);
        ragContext = relevantChunks.map((chunk) => ({
          documentName: chunk.documentName,
          text: chunk.text,
        }));
      } catch (error) {
        console.error('RAG search error:', error);
        // Continue without RAG if it fails
      }
    }

    // Step 3.5: Get personal information from request (client-side provides it from IndexedDB)
    // IndexedDB is only available in the browser, so the client fetches it and sends it here
    const personalInfoContext = body.personalInfoContext || '';

    // Step 3.6: Get persistent memory context (server-side can access IndexedDB via client)
    // For now, we'll get it from the request body (client fetches and sends)
    const memoryContext = body.memoryContext || '';

    // Step 4: Route to optimal model
    const { config, taskType } = await routeRequest(messages, {
      hasImages: files.some((f: any) => f.type?.startsWith('image/')),
      hasCode: /```/.test(lastMessage),
      fileCount: files.length,
      userOverride,
      mode, // Pass mode to router
      deepWebSearch, // Pass deep web search flag
    });

    // Step 5: Optimize conversation context (hot-warm-cold)
    const conversationMessages: ConversationMessage[] = messages.map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      timestamp: m.timestamp || Date.now(),
      images: m.images,
    }));

    // Build optimized context (hot-warm-cold management)
    const optimizedMessages = buildOptimizedContext(
      conversationMessages,
      config.maxTokens * 0.8 // Use 80% of max tokens for context
    );

    // Step 6: Build enhanced messages with system prompt and handle images
    const systemPrompt = getSystemPrompt(taskType, mode, ragContext, toolResults, personalInfoContext, memoryContext);
    
    // Convert optimized messages to proper format with images
    // Filter out system messages from optimized (we add our own)
    const userMessages = optimizedMessages.filter((m: any) => m.role !== 'system');
    
    const enhancedMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...userMessages
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
                  console.warn('Invalid image format, skipping:', imageUrl.substring(0, 50));
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

    // Step 7: Get provider and stream response
    const provider = providers[config.provider];
    if (!provider) {
      return NextResponse.json(
        { error: `Provider ${config.provider} not found` },
        { status: 400 }
      );
    }

    // Check if provider is available (has API key)
    if (!provider.isAvailable()) {
      return NextResponse.json(
        { 
          error: `Provider ${config.provider} is not configured. Please add ${config.provider.toUpperCase()}_API_KEY to your environment variables.`,
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
            model: config.model,
            provider: config.provider,
            providerName: provider.name,
            toolsUsed: requiredTools,
            costPer1M: config.costPer1M,
          };
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(metadata)}\n\n`)
          );

          // Stream the actual response and capture usage
          let usageData: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null = null;
          
          for await (const chunk of provider.streamCall(enhancedMessages, {
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
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
          console.error('Streaming error:', error);
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
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
