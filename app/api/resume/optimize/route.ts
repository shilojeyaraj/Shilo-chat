import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/llm/providers';
import { Message } from '@/lib/llm/types';
import { routeAgentToOptimalLLM, getAgentFallbackChain } from '@/lib/llm/agent-router';
import { getResumeOptimizationPrompt } from '@/lib/prompts/agent-prompts';

export async function POST(req: NextRequest) {
  try {
    const { latexResume, jobPosting, personalInfoContext } = await req.json();

    if (!latexResume || !latexResume.trim()) {
      return NextResponse.json(
        { error: 'LaTeX resume is required' },
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

    // Use agent-specific routing for resume optimization
    // Optimal: Claude Sonnet 4.5 (best reasoning, structured output)
    const config = routeAgentToOptimalLLM('resume', {});
    const fallbackChain = getAgentFallbackChain('resume');

    // Check if OpenRouter is available
    const openRouterProvider = providers.openrouter;
    if (!openRouterProvider || !openRouterProvider.isAvailable()) {
      return NextResponse.json(
        { error: 'OPEN_ROUTER_KEY is required. Please add it to your environment variables.' },
        { status: 500 }
      );
    }

    // Use optimized resume prompt
    const prompt = getResumeOptimizationPrompt(personalInfoContext, latexResume, jobPosting);

    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are an expert resume optimization agent. You preserve LaTeX structure exactly and optimize content using a weighted scoring system to select the most impactful experiences. The resume must contain ONLY 4 sections: Education, Technical Skills, Experience, and Projects. You use quantifiable metrics, technical alignment, and problem-solving complexity to maximize interview chances. You never use content from the original resume, only from the personal information database.',
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
          maxTokens: modelConfig.maxTokens || 16384, // LaTeX can be very long
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
          console.warn(`[Resume Optimize] ${model} auth failed, trying next model...`);
          continue; // Try next model
        }
        
        // For other errors (rate limit, quota, etc.), also try next model
        if (errorMessage.includes('rate limit') || 
            errorMessage.includes('429') ||
            errorMessage.includes('quota') ||
            errorMessage.includes('funding')) {
          console.warn(`[Resume Optimize] ${model} failed (${errorMessage}), trying next model...`);
          continue;
        }
        
        // For unexpected errors, still try next model but log it
        console.warn(`[Resume Optimize] ${model} error: ${errorMessage}, trying next model...`);
        continue;
      }
    }

    // If we tried all models and none worked
    if (!response) {
      const errorMsg = lastError?.message || 'All models failed';
      return NextResponse.json(
        { 
          error: `Failed to optimize resume. Tried models: ${triedModels.join(', ')}. Last error: ${errorMsg}`,
          triedModels 
        },
        { status: 500 }
      );
    }

    let optimizedLatex = response.content || '';

    // Clean up response (remove markdown code blocks if present)
    optimizedLatex = optimizedLatex.replace(/```latex\n?/g, '').replace(/```\n?/g, '').trim();
    
    // If response doesn't start with \documentclass, try to extract it
    if (!optimizedLatex.startsWith('\\documentclass')) {
      const match = optimizedLatex.match(/```(?:latex)?\s*([\s\S]*?)\s*```/) 
        || optimizedLatex.match(/(\\documentclass[\s\S]*)/);
      if (match) {
        optimizedLatex = match[1].trim();
      } else {
        // If we can't find LaTeX, return original with a note
        console.warn('Could not extract optimized LaTeX, returning original');
        optimizedLatex = latexResume;
      }
    }

    return NextResponse.json({ optimizedLatex });

  } catch (error: any) {
    console.error('Resume optimization error:', error);
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
      { error: `Failed to optimize resume: ${errorMessage}` },
      { status: 500 }
    );
  }
}

