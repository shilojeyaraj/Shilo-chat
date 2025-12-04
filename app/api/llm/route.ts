import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, model = 'groq', ragContext } = await req.json();

    // Build enhanced context with RAG results
    let systemMessage = `You are an AI pair programming assistant. You have access to:
- User's uploaded documents (via RAG)
- Web search results (when explicitly requested)
- User's coding history and preferences
- File contents from their project

CRITICAL BEHAVIORS:
- When writing code, ALWAYS make it immediately runnable
- Add all imports, dependencies, error handling
- For React components, ensure they're self-contained
- Remember user's coding patterns and replicate their style
- Use provided context from uploaded documents when relevant
`;

    // Add RAG context if available
    if (ragContext && ragContext.length > 0) {
      systemMessage += '\n\nRelevant context from uploaded documents:\n';
      ragContext.forEach((chunk: any, index: number) => {
        systemMessage += `\n[Document ${index + 1}: ${chunk.documentName}]\n${chunk.text}\n`;
      });
    }

    // Prepare messages with system prompt
    const enhancedMessages = [
      { role: 'system', content: systemMessage },
      ...messages,
    ];

    // Call LLM API based on model
    let apiUrl = '';
    let apiKey = '';
    let headers: Record<string, string> = {};

    if (model === 'groq') {
      apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      apiKey = process.env.GROQ_API_KEY || '';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    } else if (model === 'kimi') {
      apiUrl = 'https://api.moonshot.cn/v1/chat/completions';
      apiKey = process.env.KIMI_API_KEY || '';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    } else if (model === 'openrouter') {
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      apiKey = process.env.OPENROUTER_API_KEY || '';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || '',
        'X-Title': 'Mid Chats',
        'Content-Type': 'application/json',
      };
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: `API key not found for model: ${model}` },
        { status: 400 }
      );
    }

    // Determine model name based on provider
    let modelName = '';
    if (model === 'groq') {
      modelName = 'llama-3.3-70b-versatile';
    } else if (model === 'kimi') {
      modelName = 'moonshot-v1-128k'; // Kimi K2
    } else if (model === 'openrouter') {
      modelName = 'anthropic/claude-3.5-sonnet';
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages: enhancedMessages,
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `LLM API error: ${response.statusText}`, details: error },
        { status: response.status }
      );
    }

    // Return streaming response with proper headers
    // The response body is already in SSE format from the provider
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering for nginx
      },
    });
  } catch (error) {
    console.error('LLM API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

