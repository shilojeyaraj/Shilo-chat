import { Message, LLMConfig, LLMResponse } from './types';

export interface LLMProvider {
  name: string;
  call: (messages: Message[], config: LLMConfig) => Promise<LLMResponse>;
  streamCall: (messages: Message[], config: LLMConfig) => AsyncGenerator<string>;
  isAvailable: () => boolean;
}

/**
 * Groq Provider - Fastest and cheapest
 */
const groqProvider: LLMProvider = {
  name: 'Groq',
  isAvailable: () => !!process.env.GROQ_API_KEY,
  call: async (messages, config) => {
    // Validate API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }

    // Groq only supports string content, not arrays (no multimodal)
    // Convert array content to string by extracting text parts
    const formattedMessages = messages.map((m: any) => {
      if (Array.isArray(m.content)) {
        // Extract text parts from array content
        const textParts = m.content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text || '')
          .join(' ');
        
        // If there were images, add a note
        const hasImages = m.content.some((part: any) => part.type === 'image_url' || part.type === 'image');
        const imageNote = hasImages ? ' [Note: Images were included but Groq does not support image analysis. Please describe the image in text if needed.]' : '';
        
        return {
          role: m.role,
          content: textParts + imageNote || ' ', // Ensure non-empty
        };
      }
      
      // Already a string, ensure it's not empty
      return {
        role: m.role,
        content: typeof m.content === 'string' ? (m.content.trim() || ' ') : String(m.content || ' '),
      };
    });

    const requestBody = {
      model: config.model,
      messages: formattedMessages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Groq API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || response.statusText;
      }
      throw new Error(`Groq API error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  },
  streamCall: async function* (messages, config) {
    // Validate API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }

    // Groq only supports string content, not arrays (no multimodal)
    // Convert array content to string by extracting text parts
    const formattedMessages = messages.map((m: any) => {
      if (Array.isArray(m.content)) {
        // Extract text parts from array content
        const textParts = m.content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text || '')
          .join(' ');
        
        // If there were images, add a note
        const hasImages = m.content.some((part: any) => part.type === 'image_url' || part.type === 'image');
        const imageNote = hasImages ? ' [Note: Images were included but Groq does not support image analysis. Please describe the image in text if needed.]' : '';
        
        return {
          role: m.role,
          content: textParts + imageNote || ' ', // Ensure non-empty
        };
      }
      
      // Already a string, ensure it's not empty
      return {
        role: m.role,
        content: typeof m.content === 'string' ? (m.content.trim() || ' ') : String(m.content || ' '),
      };
    });

    const requestBody = {
      model: config.model,
      messages: formattedMessages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Groq API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || response.statusText;
      }
      throw new Error(`Groq API error (${response.status}): ${errorMessage}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]' || !data) continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  },
};

/**
 * Perplexity Provider - Best for web search
 */
const perplexityProvider: LLMProvider = {
  name: 'Perplexity',
  isAvailable: () => !!process.env.PERPLEXITY_API_KEY,
  call: async (messages, config) => {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'llama-3.1-sonar-large-128k-online',
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.statusText} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  },
  streamCall: async function* (messages, config) {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'llama-3.1-sonar-large-128k-online',
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]' || !data) continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  },
};

/**
 * Kimi K2 Provider (Moonshot AI - OpenAI Compatible)
 */
const kimiProvider: LLMProvider = {
  name: 'Kimi',
  isAvailable: () => !!process.env.KIMI_API_KEY,
  call: async (messages, config) => {
    // Format messages for OpenAI (handle images - OpenAI uses image_url format)
    const formattedMessages = messages
      .filter(m => m.role !== 'system') // System messages handled separately
      .map((m: any) => {
        // If content is already an array (has images), validate and use it
        if (Array.isArray(m.content)) {
          // Validate and clean image URLs
          const cleanedContent = m.content.map((part: any) => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text || '' };
            } else if (part.type === 'image_url' && part.image_url) {
              // Ensure image URL is properly formatted
              let imageUrl = part.image_url.url || part.image_url;
              
              // Validate base64 data URL format
              if (typeof imageUrl === 'string') {
                // If it's already a data URL, use it
                if (imageUrl.startsWith('data:')) {
                  return {
                    type: 'image_url',
                    image_url: { url: imageUrl },
                  };
                }
                // If it's base64 without prefix, add data URL prefix
                if (!imageUrl.includes('://')) {
                  // Try to detect MIME type
                  const mimeType = imageUrl.match(/^data:([^;]+)/)?.[1] || 'image/png';
                  return {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${imageUrl}` },
                  };
                }
              }
              
              return {
                type: 'image_url',
                image_url: { url: imageUrl },
              };
            }
            return part;
          }).filter((part: any) => {
            // Remove invalid parts
            if (part.type === 'text' && !part.text?.trim()) return false;
            if (part.type === 'image_url' && !part.image_url?.url) return false;
            return true;
          });
          
          // Ensure at least one valid content block
          if (cleanedContent.length === 0) {
            return {
              role: m.role,
              content: ' ', // Empty space as fallback
            };
          }
          
          return {
            role: m.role,
            content: cleanedContent,
          };
        }
        // Regular text message
        const textContent = typeof m.content === 'string' ? m.content.trim() : '';
        return {
          role: m.role,
          content: textContent || ' ', // Ensure non-empty
        };
      })
      .filter((m: any) => {
        // Filter out empty messages
        if (m.role === 'user' && typeof m.content === 'string' && !m.content.trim()) {
          return false;
        }
        return true;
      });

    // Extract system message
    const systemMessage = messages.find(m => m.role === 'system');
    const systemContent = systemMessage 
      ? (typeof systemMessage.content === 'string' ? systemMessage.content : '')
      : undefined;

    // Determine model - use moonshot-v1-128k (Kimi K2) for best performance
    // Kimi supports vision, so we can use the same model for both
    const hasImages = formattedMessages.some((m: any) => 
      Array.isArray(m.content) && m.content.some((p: any) => p.type === 'image_url')
    );
    // Kimi K2 models: kimi-k2-0905-preview, kimi-k2-turbo-preview, kimi-k2-thinking, kimi-k2-thinking-turbo
    // Default to kimi-k2-turbo-preview for best balance of speed and quality
    const modelName = config.model || 'kimi-k2-turbo-preview';

    const requestBody: any = {
      model: modelName,
      messages: formattedMessages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    // Add system message if present (Kimi supports it, OpenAI-compatible)
    if (systemContent) {
      requestBody.messages.unshift({
        role: 'system',
        content: systemContent,
      });
    }

    // Validate API key before making request
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
      throw new Error('KIMI_API_KEY is not set in environment variables. Please add it to Vercel environment variables.');
    }
    
    // Trim whitespace (common issue)
    const trimmedKey = apiKey.trim();
    if (trimmedKey.length === 0) {
      throw new Error('KIMI_API_KEY is empty. Please check your Vercel environment variables.');
    }

    // Use the correct Kimi K2 API endpoint (api.moonshot.ai for K2 models)
    const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${trimmedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Kimi API error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
        console.error('Kimi API Error Details:', errorJson);
        
        // Provide helpful error message for authentication errors
        if (response.status === 401 || response.status === 403 || errorMessage.includes('Invalid Authentication')) {
          const keyPreview = trimmedKey ? `${trimmedKey.substring(0, 8)}...${trimmedKey.substring(trimmedKey.length - 4)}` : 'NOT SET';
          errorMessage = `Kimi API Authentication Failed. Please check:\n` +
            `1. KIMI_API_KEY is set in Vercel environment variables\n` +
            `2. The key is correct (no extra spaces, full key copied)\n` +
            `3. The key is active (check at https://platform.moonshot.cn)\n` +
            `4. You've redeployed after adding the key\n` +
            `Current key preview: ${keyPreview}`;
        }
        
        console.error('Request body:', JSON.stringify(requestBody, null, 2));
      } catch {
        errorMessage = errorText || response.statusText;
        console.error('Kimi API Error (raw):', errorText);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  },
  streamCall: async function* (messages, config) {
    // Format messages for Kimi (OpenAI-compatible, handles images with image_url format)
    const formattedMessages = messages
      .filter(m => m.role !== 'system') // System messages handled separately
      .map((m: any) => {
        // If content is already an array (has images), validate and use it
        if (Array.isArray(m.content)) {
          // Validate and clean image URLs
          const cleanedContent = m.content.map((part: any) => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text || '' };
            } else if (part.type === 'image_url' && part.image_url) {
              // Ensure image URL is properly formatted
              let imageUrl = part.image_url.url || part.image_url;
              
              // Validate base64 data URL format
              if (typeof imageUrl === 'string') {
                // If it's already a data URL, use it
                if (imageUrl.startsWith('data:')) {
                  return {
                    type: 'image_url',
                    image_url: { url: imageUrl },
                  };
                }
                // If it's base64 without prefix, add data URL prefix
                if (!imageUrl.includes('://')) {
                  // Try to detect MIME type
                  const mimeType = imageUrl.match(/^data:([^;]+)/)?.[1] || 'image/png';
                  return {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${imageUrl}` },
                  };
                }
              }
              
              return {
                type: 'image_url',
                image_url: { url: imageUrl },
              };
            }
            return part;
          }).filter((part: any) => {
            // Remove invalid parts
            if (part.type === 'text' && !part.text?.trim()) return false;
            if (part.type === 'image_url' && !part.image_url?.url) return false;
            return true;
          });
          
          // Ensure at least one valid content block
          if (cleanedContent.length === 0) {
            return {
              role: m.role,
              content: ' ', // Empty space as fallback
            };
          }
          
          return {
            role: m.role,
            content: cleanedContent,
          };
        }
        // Regular text message
        const textContent = typeof m.content === 'string' ? m.content.trim() : '';
        return {
          role: m.role,
          content: textContent || ' ', // Ensure non-empty
        };
      })
      .filter((m: any) => {
        // Filter out empty messages
        if (m.role === 'user' && typeof m.content === 'string' && !m.content.trim()) {
          return false;
        }
        return true;
      });

    // Extract system message
    const systemMessage = messages.find(m => m.role === 'system');
    const systemContent = systemMessage 
      ? (typeof systemMessage.content === 'string' ? systemMessage.content : '')
      : undefined;

    // Determine model - use moonshot-v1-128k (Kimi K2) for best performance
    // Kimi supports vision, so we can use the same model for both
    const hasImages = formattedMessages.some((m: any) => 
      Array.isArray(m.content) && m.content.some((p: any) => p.type === 'image_url')
    );
    // Kimi K2 models: kimi-k2-0905-preview, kimi-k2-turbo-preview, kimi-k2-thinking, kimi-k2-thinking-turbo
    // Default to kimi-k2-turbo-preview for best balance of speed and quality
    const modelName = config.model || 'kimi-k2-turbo-preview';

    const requestBody: any = {
      model: modelName,
      messages: formattedMessages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    };

    // Add system message if present (Kimi supports it, OpenAI-compatible)
    if (systemContent) {
      requestBody.messages.unshift({
        role: 'system',
        content: systemContent,
      });
    }

    // Log request for debugging
    console.log('Kimi API Request:', JSON.stringify({
      ...requestBody,
      messages: requestBody.messages.map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' 
          ? m.content.substring(0, 100) + '...' 
          : Array.isArray(m.content) 
            ? `[Array with ${m.content.length} items]` 
            : m.content,
      })),
    }, null, 2));

    // Validate API key before making request
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
      throw new Error('KIMI_API_KEY is not set in environment variables. Please add it to Vercel environment variables.');
    }
    
    // Trim whitespace (common issue)
    const trimmedKey = apiKey.trim();
    if (trimmedKey.length === 0) {
      throw new Error('KIMI_API_KEY is empty. Please check your Vercel environment variables.');
    }

    // Use the correct Kimi K2 API endpoint (api.moonshot.ai for K2 models)
    const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${trimmedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Kimi API error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
        console.error('Kimi API Error Details:', errorJson);
        
        // Provide helpful error message for authentication errors
        if (response.status === 401 || response.status === 403 || errorMessage.includes('Invalid Authentication')) {
          const keyPreview = trimmedKey ? `${trimmedKey.substring(0, 8)}...${trimmedKey.substring(trimmedKey.length - 4)}` : 'NOT SET';
          errorMessage = `Kimi API Authentication Failed. Please check:\n` +
            `1. KIMI_API_KEY is set in Vercel environment variables\n` +
            `2. The key is correct (no extra spaces, full key copied)\n` +
            `3. The key is active (check at https://platform.moonshot.cn)\n` +
            `4. You've redeployed after adding the key\n` +
            `Current key preview: ${keyPreview}`;
        }
        
        console.error('Request body:', JSON.stringify(requestBody, null, 2));
      } catch {
        errorMessage = errorText || response.statusText;
        console.error('Kimi API Error (raw):', errorText);
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]' || !data) continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  },
};

/**
 * OpenAI Provider - Best for vision/image analysis
 */
const openaiProvider: LLMProvider = {
  name: 'OpenAI',
  isAvailable: () => !!process.env.OPENAI_API_KEY,
  call: async (messages, config) => {
    // Validate API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Format messages for OpenAI (handle images)
    const systemMessage = messages.find(m => m.role === 'system');
    const systemContent = systemMessage 
      ? (typeof systemMessage.content === 'string' ? systemMessage.content : '')
      : undefined;

    const formattedMessages = messages
      .filter(m => m.role !== 'system') // System messages handled separately
      .map((m: any) => {
        // If content is an array (has images), use it directly (OpenAI format)
        if (Array.isArray(m.content)) {
          // Validate and clean image URLs
          const cleanedContent = m.content.map((part: any) => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text || '' };
            } else if (part.type === 'image_url' && part.image_url) {
              // Ensure image URL is properly formatted
              let imageUrl = part.image_url.url || part.image_url;
              
              // Validate base64 data URL format
              if (typeof imageUrl === 'string') {
                // If it's already a data URL, use it
                if (imageUrl.startsWith('data:')) {
                  return {
                    type: 'image_url',
                    image_url: { url: imageUrl },
                  };
                }
                // If it's base64 without prefix, add data URL prefix
                if (!imageUrl.includes('://')) {
                  // Try to detect MIME type
                  const mimeType = imageUrl.match(/^data:([^;]+)/)?.[1] || 'image/png';
                  return {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${imageUrl}` },
                  };
                }
              }
              
              return {
                type: 'image_url',
                image_url: { url: imageUrl },
              };
            }
            return part;
          }).filter((part: any) => {
            // Remove invalid parts
            if (part.type === 'text' && !part.text?.trim()) return false;
            if (part.type === 'image_url' && !part.image_url?.url) return false;
            return true;
          });
          
          // Ensure at least one valid content block
          if (cleanedContent.length === 0) {
            return {
              role: m.role,
              content: ' ', // Empty space as fallback
            };
          }
          
          return {
            role: m.role,
            content: cleanedContent,
          };
        }
        
        // Regular text message
        const textContent = typeof m.content === 'string' ? m.content.trim() : '';
        return {
          role: m.role,
          content: textContent || ' ', // Ensure non-empty
        };
      })
      .filter((m: any) => {
        // Filter out empty messages
        if (m.role === 'user' && typeof m.content === 'string' && !m.content.trim()) {
          return false;
        }
        return true;
      });

    // Determine model - use gpt-4o for vision, gpt-4o-mini for text (or config override)
    const hasImages = formattedMessages.some((m: any) => 
      Array.isArray(m.content) && m.content.some((p: any) => p.type === 'image_url')
    );
    const modelName = config.model || (hasImages ? 'gpt-4o' : 'gpt-4o-mini');

    const requestBody: any = {
      model: modelName,
      messages: formattedMessages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    // Add system message if present
    if (systemContent) {
      requestBody.messages.unshift({
        role: 'system',
        content: systemContent,
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenAI API error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
        console.error('OpenAI API Error Details:', errorJson);
        console.error('OpenAI API Request Body:', JSON.stringify(requestBody, null, 2));
      } catch {
        errorMessage = errorText || response.statusText;
        console.error('OpenAI API Error (raw):', errorText);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  },
  streamCall: async function* (messages, config) {
    // Validate API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Format messages for OpenAI (handle images)
    const systemMessage = messages.find(m => m.role === 'system');
    const systemContent = systemMessage 
      ? (typeof systemMessage.content === 'string' ? systemMessage.content : '')
      : undefined;

    const formattedMessages = messages
      .filter(m => m.role !== 'system') // System messages handled separately
      .map((m: any) => {
        // If content is an array (has images), use it directly (OpenAI format)
        if (Array.isArray(m.content)) {
          // Validate and clean image URLs
          const cleanedContent = m.content.map((part: any) => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text || '' };
            } else if (part.type === 'image_url' && part.image_url) {
              // Ensure image URL is properly formatted
              let imageUrl = part.image_url.url || part.image_url;
              
              // Validate base64 data URL format
              if (typeof imageUrl === 'string') {
                // If it's already a data URL, use it
                if (imageUrl.startsWith('data:')) {
                  return {
                    type: 'image_url',
                    image_url: { url: imageUrl },
                  };
                }
                // If it's base64 without prefix, add data URL prefix
                if (!imageUrl.includes('://')) {
                  // Try to detect MIME type
                  const mimeType = imageUrl.match(/^data:([^;]+)/)?.[1] || 'image/png';
                  return {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${imageUrl}` },
                  };
                }
              }
              
              return {
                type: 'image_url',
                image_url: { url: imageUrl },
              };
            }
            return part;
          }).filter((part: any) => {
            // Remove invalid parts
            if (part.type === 'text' && !part.text?.trim()) return false;
            if (part.type === 'image_url' && !part.image_url?.url) return false;
            return true;
          });
          
          // Ensure at least one valid content block
          if (cleanedContent.length === 0) {
            return {
              role: m.role,
              content: ' ', // Empty space as fallback
            };
          }
          
          return {
            role: m.role,
            content: cleanedContent,
          };
        }
        
        // Regular text message
        const textContent = typeof m.content === 'string' ? m.content.trim() : '';
        return {
          role: m.role,
          content: textContent || ' ', // Ensure non-empty
        };
      })
      .filter((m: any) => {
        // Filter out empty messages
        if (m.role === 'user' && typeof m.content === 'string' && !m.content.trim()) {
          return false;
        }
        return true;
      });

    // Determine model - use gpt-4o for vision, gpt-4o-mini for text (or config override)
    const hasImages = formattedMessages.some((m: any) => 
      Array.isArray(m.content) && m.content.some((p: any) => p.type === 'image_url')
    );
    const modelName = config.model || (hasImages ? 'gpt-4o' : 'gpt-4o-mini');

    const requestBody: any = {
      model: modelName,
      messages: formattedMessages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    };

    // Add system message if present
    if (systemContent) {
      requestBody.messages.unshift({
        role: 'system',
        content: systemContent,
      });
    }

    // Log request for debugging
    console.log('OpenAI API Request:', JSON.stringify({
      ...requestBody,
      messages: requestBody.messages.map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' 
          ? m.content.substring(0, 100) + '...' 
          : Array.isArray(m.content) 
            ? `[Array with ${m.content.length} items]` 
            : m.content,
      })),
    }, null, 2));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenAI API error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
        console.error('OpenAI API Error Details:', errorJson);
      } catch {
        errorMessage = errorText || response.statusText;
        console.error('OpenAI API Error (raw):', errorText);
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]' || !data) continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  },
};

/**
 * Anthropic Provider
 */
const anthropicProvider: LLMProvider = {
  name: 'Anthropic',
  isAvailable: () => !!process.env.ANTHROPIC_API_KEY,
  call: async (messages, config) => {
    // Format messages for Anthropic (handle images)
    const systemMessage = messages.find(m => m.role === 'system');
    const systemContent = systemMessage 
      ? (typeof systemMessage.content === 'string' ? systemMessage.content : '')
      : '';

    const formattedMessages = messages
      .filter(m => m.role !== 'system' && m.role !== 'assistant') // Anthropic doesn't allow assistant messages in input
      .map((m: any) => {
        // If content is an array (has images), convert to Anthropic format
        if (Array.isArray(m.content)) {
          const contentArray = m.content
            .map((part: any) => {
              if (part.type === 'text') {
                const text = part.text || '';
                if (!text.trim()) return null; // Skip empty text parts
                return { type: 'text', text };
              } else if (part.type === 'image_url' || part.image_url) {
                // Convert OpenAI format to Anthropic format
                const imageUrl = part.image_url?.url || part.image_url;
                if (!imageUrl) return null;
                
                const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;
                const mimeType = imageUrl.match(/data:([^;]+)/)?.[1] || 'image/png';
                
                return {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Data,
                  },
                };
              }
              return null;
            })
            .filter((part: any) => part !== null); // Remove null entries

          // Anthropic requires at least one content block
          if (contentArray.length === 0) {
            return {
              role: m.role,
              content: ' ', // Empty space if no valid content
            };
          }

          return {
            role: m.role,
            content: contentArray,
          };
        }
        
        // Regular text message - ensure it's a non-empty string
        const textContent = typeof m.content === 'string' ? m.content.trim() : '';
        return {
          role: m.role,
          content: textContent || ' ', // Empty space if no content
        };
      })
      .filter((m: any) => {
        // Filter out messages with empty content (unless it's the last user message)
        if (m.role === 'user' && (!m.content || (typeof m.content === 'string' && !m.content.trim()))) {
          return false;
        }
        return true;
      });

    // Ensure we have at least one message
    if (formattedMessages.length === 0) {
      throw new Error('No valid messages to send to Anthropic API');
    }

    const requestBody = {
      model: config.model || 'claude-3-5-sonnet-20240620',
      messages: formattedMessages,
      system: systemContent,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Anthropic API error (${response.status}): ${response.statusText}`;
      let isFundingError = false;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
        console.error('Anthropic API Error Details:', errorJson);
        
        // Detect funding/quota errors
        const errorType = errorJson.error?.type || errorJson.type || '';
        const errorMsg = (errorMessage || '').toLowerCase();
        isFundingError = 
          errorType === 'insufficient_quota' ||
          errorType === 'payment_required' ||
          errorMsg.includes('insufficient quota') ||
          errorMsg.includes('payment required') ||
          errorMsg.includes('funding') ||
          errorMsg.includes('credit') ||
          errorMsg.includes('balance') ||
          response.status === 402 || // Payment Required
          response.status === 429; // Rate limit (could also be quota)
      } catch {
        errorMessage = errorText || response.statusText;
        console.error('Anthropic API Error (raw):', errorText);
      }
      
      const error = new Error(errorMessage);
      (error as any).isFundingError = isFundingError;
      throw error;
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || '',
      usage: data.usage,
    };
  },
  streamCall: async function* (messages, config) {
    // Format messages for Anthropic (handle images)
    const systemMessage = messages.find(m => m.role === 'system');
    const systemContent = systemMessage 
      ? (typeof systemMessage.content === 'string' ? systemMessage.content : '')
      : '';

    const formattedMessages = messages
      .filter(m => m.role !== 'system' && m.role !== 'assistant') // Anthropic doesn't allow assistant messages in input
      .map((m: any) => {
        // If content is an array (has images), convert to Anthropic format
        if (Array.isArray(m.content)) {
          const contentArray = m.content
            .map((part: any) => {
              if (part.type === 'text') {
                const text = part.text || '';
                if (!text.trim()) return null; // Skip empty text parts
                return { type: 'text', text };
              } else if (part.type === 'image_url' || part.image_url) {
                // Convert OpenAI format to Anthropic format
                const imageUrl = part.image_url?.url || part.image_url;
                if (!imageUrl) return null;
                
                const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;
                const mimeType = imageUrl.match(/data:([^;]+)/)?.[1] || 'image/png';
                
                return {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Data,
                  },
                };
              }
              return null;
            })
            .filter((part: any) => part !== null); // Remove null entries

          // Anthropic requires at least one content block
          if (contentArray.length === 0) {
            return {
              role: m.role,
              content: ' ', // Empty space if no valid content
            };
          }

          return {
            role: m.role,
            content: contentArray,
          };
        }
        
        // Regular text message - ensure it's a non-empty string
        const textContent = typeof m.content === 'string' ? m.content.trim() : '';
        return {
          role: m.role,
          content: textContent || ' ', // Empty space if no content
        };
      })
      .filter((m: any) => {
        // Filter out messages with empty content (unless it's the last user message)
        if (m.role === 'user' && (!m.content || (typeof m.content === 'string' && !m.content.trim()))) {
          return false;
        }
        return true;
      });

    // Ensure we have at least one message
    if (formattedMessages.length === 0) {
      throw new Error('No valid messages to send to Anthropic API');
    }

    const requestBody = {
      model: config.model || 'claude-3-5-sonnet-20240620',
      messages: formattedMessages,
      system: systemContent,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    };

    // Log request for debugging (remove in production)
    console.log('Anthropic API Request:', JSON.stringify({
      ...requestBody,
      messages: requestBody.messages.map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' 
          ? m.content.substring(0, 100) + '...' 
          : Array.isArray(m.content) 
            ? `[Array with ${m.content.length} items]` 
            : m.content,
      })),
    }, null, 2));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Anthropic API error (${response.status}): ${response.statusText}`;
      let isFundingError = false;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
        console.error('Anthropic API Error Details:', errorJson);
        
        // Detect funding/quota errors
        const errorType = errorJson.error?.type || errorJson.type || '';
        const errorMsg = (errorMessage || '').toLowerCase();
        isFundingError = 
          errorType === 'insufficient_quota' ||
          errorType === 'payment_required' ||
          errorMsg.includes('insufficient quota') ||
          errorMsg.includes('payment required') ||
          errorMsg.includes('funding') ||
          errorMsg.includes('credit') ||
          errorMsg.includes('balance') ||
          response.status === 402 || // Payment Required
          response.status === 429; // Rate limit (could also be quota)
      } catch {
        errorMessage = errorText || response.statusText;
        console.error('Anthropic API Error (raw):', errorText);
      }
      
      const error = new Error(errorMessage);
      (error as any).isFundingError = isFundingError;
      throw error;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta') {
              const content = parsed.delta?.text;
              if (content) yield content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  },
};

/**
 * Google Gemini Provider - Best for vision/image analysis
 * Uses Gemini 2.0 Flash for optimal vision performance
 */
const geminiProvider: LLMProvider = {
  name: 'Gemini',
  isAvailable: () => !!process.env.GEMINI_API_KEY,
  call: async (messages, config) => {
    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    // Format messages for Gemini API
    // Gemini uses a different format: contents array with parts (text and inlineData for images)
    const systemMessage = messages.find(m => m.role === 'system');
    const systemContent = systemMessage 
      ? (typeof systemMessage.content === 'string' ? systemMessage.content : '')
      : '';

    // Convert messages to Gemini format
    const contents: any[] = [];
    
    for (const m of messages) {
      if (m.role === 'system') continue; // System messages handled separately
      
      const parts: any[] = [];
      
      // Handle content - can be string or array (for multimodal)
      if (Array.isArray(m.content)) {
        // Multimodal content (text + images)
        for (const part of m.content) {
          if (part.type === 'text') {
            if (part.text && part.text.trim()) {
              parts.push({ text: part.text });
            }
          } else if (part.type === 'image_url' && part.image_url) {
            // Convert OpenAI format to Gemini format
            const imageUrl = part.image_url.url || part.image_url;
            if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
              // Extract base64 and mime type
              const match = imageUrl.match(/data:([^;]+);base64,(.+)/);
              if (match) {
                const mimeType = match[1];
                const base64Data = match[2];
                
                parts.push({
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  },
                });
              }
            }
          }
        }
      } else if (typeof m.content === 'string' && m.content.trim()) {
        // Text-only message
        parts.push({ text: m.content });
      }
      
      // Only add message if it has valid parts
      if (parts.length > 0) {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: parts,
        });
      }
    }

    // Ensure we have at least one content
    if (contents.length === 0) {
      throw new Error('No valid messages to send to Gemini API');
    }

    // Build request body
    const requestBody: any = {
      contents: contents,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    };

    // Add system instruction if present
    if (systemContent) {
      requestBody.systemInstruction = {
        parts: [{ text: systemContent }],
      };
    }

    // Use Gemini 2.0 Flash for vision (best model for images)
    const modelName = config.model || 'gemini-2.0-flash-exp';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Gemini API error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
        console.error('Gemini API Error Details:', errorJson);
        console.error('Gemini API Request Body:', JSON.stringify({
          ...requestBody,
          contents: requestBody.contents.map((c: any) => ({
            role: c.role,
            parts: c.parts.map((p: any) => 
              p.text ? { text: p.text.substring(0, 100) + '...' } : 
              p.inlineData ? { inlineData: { mimeType: p.inlineData.mimeType, data: '[base64 data]' } } : 
              p
            ),
          })),
        }, null, 2));
      } catch {
        errorMessage = errorText || response.statusText;
        console.error('Gemini API Error (raw):', errorText);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Extract response text from Gemini format
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usage = data.usageMetadata || {};

    return {
      content: responseText,
      usage: {
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      },
    };
  },
  streamCall: async function* (messages, config) {
    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    // Format messages for Gemini API (same as call method)
    const systemMessage = messages.find(m => m.role === 'system');
    const systemContent = systemMessage 
      ? (typeof systemMessage.content === 'string' ? systemMessage.content : '')
      : '';

    const contents: any[] = [];
    
    for (const m of messages) {
      if (m.role === 'system') continue;
      
      const parts: any[] = [];
      
      if (Array.isArray(m.content)) {
        for (const part of m.content) {
          if (part.type === 'text') {
            if (part.text && part.text.trim()) {
              parts.push({ text: part.text });
            }
          } else if (part.type === 'image_url' && part.image_url) {
            const imageUrl = part.image_url.url || part.image_url;
            if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
              const match = imageUrl.match(/data:([^;]+);base64,(.+)/);
              if (match) {
                const mimeType = match[1];
                const base64Data = match[2];
                
                parts.push({
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  },
                });
              }
            }
          }
        }
      } else if (typeof m.content === 'string' && m.content.trim()) {
        parts.push({ text: m.content });
      }
      
      if (parts.length > 0) {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: parts,
        });
      }
    }

    if (contents.length === 0) {
      throw new Error('No valid messages to send to Gemini API');
    }

    const requestBody: any = {
      contents: contents,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    };

    if (systemContent) {
      requestBody.systemInstruction = {
        parts: [{ text: systemContent }],
      };
    }

    const modelName = config.model || 'gemini-2.0-flash-exp';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey.trim()}`;

    // Log request for debugging
    console.log('Gemini API Request:', JSON.stringify({
      ...requestBody,
      contents: requestBody.contents.map((c: any) => ({
        role: c.role,
        parts: c.parts.map((p: any) => 
          p.text ? { text: p.text.substring(0, 100) + '...' } : 
          p.inlineData ? { inlineData: { mimeType: p.inlineData.mimeType, data: '[base64 data]' } } : 
          p
        ),
      })),
    }, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Gemini API error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
        console.error('Gemini API Error Details:', errorJson);
      } catch {
        errorMessage = errorText || response.statusText;
        console.error('Gemini API Error (raw):', errorText);
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(line);
            // Gemini streaming format: each chunk is a complete JSON object
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield text;
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  },
};

/**
 * OpenRouter Provider - Unified access to 400+ models via single API
 */
const openRouterProvider: LLMProvider = {
  name: 'OpenRouter',
  isAvailable: () => !!process.env.OPEN_ROUTER_KEY,
  call: async (messages, config) => {
    const apiKey = process.env.OPEN_ROUTER_KEY;
    if (!apiKey) {
      throw new Error('OPEN_ROUTER_KEY is not set in environment variables');
    }

    // Format messages for OpenAI-compatible API (OpenRouter uses OpenAI format)
    const systemMessage = messages.find(m => m.role === 'system');
    const systemContent = systemMessage 
      ? (typeof systemMessage.content === 'string' ? systemMessage.content : '')
      : undefined;

    const formattedMessages = messages
      .filter(m => m.role !== 'system') // System messages handled separately
      .map((m: any) => {
        // If content is an array (has images), use it directly (OpenAI format)
        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            content: m.content, // Already in OpenAI format
          };
        }
        // Regular text message
        const textContent = typeof m.content === 'string' ? m.content.trim() : '';
        return {
          role: m.role,
          content: textContent || ' ', // Ensure non-empty
        };
      })
      .filter((m: any) => {
        // Filter out empty messages
        if (m.role === 'user' && typeof m.content === 'string' && !m.content.trim()) {
          return false;
        }
        return true;
      });

    const requestBody: any = {
      model: config.model, // OpenRouter model ID (e.g., "anthropic/claude-3.5-sonnet")
      messages: formattedMessages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    // Add system message if present
    if (systemContent) {
      requestBody.messages.unshift({
        role: 'system',
        content: systemContent,
      });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Shilo Chat',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter API error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
        console.error('OpenRouter API Error Details:', errorJson);
      } catch {
        errorMessage = errorText || response.statusText;
        console.error('OpenRouter API Error (raw):', errorText);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  },
  streamCall: async function* (messages, config) {
    const apiKey = process.env.OPEN_ROUTER_KEY;
    if (!apiKey) {
      throw new Error('OPEN_ROUTER_KEY is not set in environment variables');
    }

    // Format messages for OpenAI-compatible API
    const systemMessage = messages.find(m => m.role === 'system');
    const systemContent = systemMessage 
      ? (typeof systemMessage.content === 'string' ? systemMessage.content : '')
      : undefined;

    const formattedMessages = messages
      .filter(m => m.role !== 'system')
      .map((m: any) => {
        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            content: m.content,
          };
        }
        const textContent = typeof m.content === 'string' ? m.content.trim() : '';
        return {
          role: m.role,
          content: textContent || ' ',
        };
      })
      .filter((m: any) => {
        if (m.role === 'user' && typeof m.content === 'string' && !m.content.trim()) {
          return false;
        }
        return true;
      });

    const requestBody: any = {
      model: config.model,
      messages: formattedMessages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    };

    if (systemContent) {
      requestBody.messages.unshift({
        role: 'system',
        content: systemContent,
      });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Shilo Chat',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter API error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
        console.error('OpenRouter API Error Details:', errorJson);
      } catch {
        errorMessage = errorText || response.statusText;
        console.error('OpenRouter API Error (raw):', errorText);
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]' || !data) continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  },
};

export const providers: Record<string, LLMProvider> = {
  groq: groqProvider,
  perplexity: perplexityProvider,
  kimi: kimiProvider,
  anthropic: anthropicProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
  openrouter: openRouterProvider,
};

