import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/llm/providers';
import { Message } from '@/lib/llm/types';
import { routeAgentToOptimalLLM, getAgentFallbackChain } from '@/lib/llm/agent-router';
import { getCoverLetterOptimizationPrompt } from '@/lib/prompts/agent-prompts';

export async function POST(req: NextRequest) {
  try {
    const { coverLetterTemplate, jobPosting, personalInfoContext, customPrompt } = await req.json();

    if (!coverLetterTemplate || !coverLetterTemplate.trim()) {
      return NextResponse.json(
        { error: 'Cover letter template is required' },
        { status: 400 }
      );
    }

    if (!jobPosting || !jobPosting.trim()) {
      return NextResponse.json(
        { error: 'Job posting is required' },
        { status: 400 }
      );
    }

    if (!personalInfoContext || !personalInfoContext.trim()) {
      return NextResponse.json(
        { error: 'Personal information is required. Please add your information in the Personal Info section.' },
        { status: 400 }
      );
    }

    // Use agent-specific routing for cover letter optimization
    // Optimal: Claude Sonnet 4.5 (nuanced writing, tone adaptation)
    const config = routeAgentToOptimalLLM('cover-letter', {});
    const fallbackChain = getAgentFallbackChain('cover-letter');

    // Check if OpenRouter is available
    const openRouterProvider = providers.openrouter;
    if (!openRouterProvider || !openRouterProvider.isAvailable()) {
      return NextResponse.json(
        { error: 'OPEN_ROUTER_KEY is required. Please add it to your environment variables.' },
        { status: 500 }
      );
    }

    // Use optimized cover letter prompt
    const prompt = getCoverLetterOptimizationPrompt(personalInfoContext, coverLetterTemplate, jobPosting, customPrompt);

    const messages: Message[] = [
      {
        role: 'system',
        content: `You are an expert cover letter writer. You preserve the exact structure and paragraph order of the template and only optimize content using the user's personal information to match job requirements. You never use content from the original template, only from the personal information database.${customPrompt ? ' IMPORTANT: The user has provided custom instructions - follow those instructions as a priority while maintaining the template structure.' : ''}`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Try models via OpenRouter with automatic fallback using agent fallback chain
    let response;
    let lastError: Error | null = null;
    const triedModels: string[] = [];

    // Use agent config and fallback chain
    const modelsToTry = [config, ...fallbackChain].map(c => c.model);

    for (const model of modelsToTry) {
      if (triedModels.includes(model)) continue;

      try {
        triedModels.push(model);
        const modelConfig = [config, ...fallbackChain].find(c => c.model === model) || config;
        response = await openRouterProvider.call(messages, {
          model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens || 4096,
          stream: false,
        });
        // Success! Break out of loop
        break;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        
        // If it's an auth error, try next model
        if (errorMessage.includes('Authentication') || 
            errorMessage.includes('Invalid Authentication') ||
            errorMessage.includes('401') || 
            errorMessage.includes('403') ||
            errorMessage.includes('API key')) {
          console.warn(`[Cover Letter Optimize] ${model} auth failed, trying next model...`);
          continue; // Try next model
        }
        
        // For other errors (rate limit, quota, etc.), also try next model
        if (errorMessage.includes('rate limit') || 
            errorMessage.includes('429') ||
            errorMessage.includes('quota') ||
            errorMessage.includes('funding')) {
          console.warn(`[Cover Letter Optimize] ${model} failed (${errorMessage}), trying next model...`);
          continue;
        }
        
        // For unexpected errors, still try next model but log it
        console.warn(`[Cover Letter Optimize] ${model} error: ${errorMessage}, trying next model...`);
        continue;
      }
    }

    // If we tried all models and none worked
    if (!response) {
      const errorMsg = lastError?.message || 'All models failed';
      return NextResponse.json(
        { 
          error: `Failed to optimize cover letter. Tried models: ${triedModels.join(', ')}. Last error: ${errorMsg}`,
          triedModels 
        },
        { status: 500 }
      );
    }

    let optimizedCoverLetter = response.content || '';

    // Clean up response (remove markdown code blocks if present)
    optimizedCoverLetter = optimizedCoverLetter.replace(/```(?:text|txt)?\n?/g, '').replace(/```\n?/g, '').trim();

    return NextResponse.json({ optimizedCoverLetter });

  } catch (error: any) {
    console.error('Cover letter optimization error:', error);
    const errorMessage = error?.message || String(error);
    
    // Provide more specific error messages
    if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403')) {
      return NextResponse.json(
        { error: 'API key authentication failed. Please check your API keys in environment variables.' },
        { status: 401 }
      );
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a few moments.' },
        { status: 429 }
      );
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('funding')) {
      return NextResponse.json(
        { error: 'Provider quota/funding depleted. Please check your account balance.' },
        { status: 402 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to optimize cover letter: ${errorMessage}` },
      { status: 500 }
    );
  }
}

