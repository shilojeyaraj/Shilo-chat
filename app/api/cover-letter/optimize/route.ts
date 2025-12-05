import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/llm/providers';
import { Message } from '@/lib/llm/types';

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

    // Provider priority order for cover letter optimization (best quality first)
    const providerPriority = [
      { name: 'Kimi', model: 'kimi-k2-turbo-preview' }, // Kimi K2 - latest generation
      { name: 'Anthropic', model: 'claude-3-5-sonnet-20241022' }, // Updated to latest version
      { name: 'Groq', model: 'llama-3.3-70b-versatile' },
      { name: 'OpenAI', model: 'gpt-4o-mini' },
      { name: 'Gemini', model: 'gemini-1.5-pro' },
    ];

    // Find available providers in priority order
    const availableProviders = Object.values(providers).filter(p => p.isAvailable());

    if (availableProviders.length === 0) {
      return NextResponse.json(
        { error: 'No AI provider available. Please configure API keys.' },
        { status: 500 }
      );
    }

    const prompt = `You are an expert cover letter writer. Your task is to optimize a cover letter for a specific job posting while PRESERVING THE EXACT STRUCTURE AND FORMATTING of the template.

CRITICAL REQUIREMENTS:
1. Keep ALL formatting, paragraph structure, and layout EXACTLY as they are in the template
2. PRESERVE THE EXACT ORDER OF PARAGRAPHS - do NOT reorder paragraphs
3. PRESERVE THE EXACT POSITION AND STRUCTURE of each paragraph - keep paragraphs in the same location
4. Only modify the CONTENT within paragraphs (sentences, phrases, specific details)
5. Do NOT change the greeting, closing, or signature format
6. Use ONLY information from the user's personal information provided below - do NOT use any content from the original template
7. Match the tone and style of the original template
8. Keep the same paragraph order, paragraph positions, and formatting

USER'S PERSONAL INFORMATION (USE ONLY THIS DATA):
${personalInfoContext}

ORIGINAL COVER LETTER TEMPLATE (USE ONLY FOR STRUCTURE/FORMATTING):
${coverLetterTemplate}

JOB POSTING:
${jobPosting}

${customPrompt ? `\n\nCUSTOM INSTRUCTIONS (PRIORITY - follow these specific requirements):\n${customPrompt}\n\n` : ''}

TASK:
Optimize the cover letter content to match the job posting by:
${customPrompt ? `- Following the custom instructions provided above (this takes priority)\n` : ''}
- Selecting the most relevant experiences from personal info that match job requirements
- Selecting the most relevant skills from personal info that match job requirements
- Selecting the most relevant projects from personal info that match job requirements
- Rewriting sentences and paragraphs using ONLY information from personal info
- Using keywords from the job posting naturally in the content
- Keeping ALL structure, formatting, and PARAGRAPH ORDER identical to the template

CRITICAL STRUCTURE RULES:
- Keep greeting in the exact same position and format
- Keep each paragraph in the exact same position as in the template
- Keep closing in the exact same position and format
- Do NOT reorder paragraphs - only swap out the content within each paragraph
- If the template has paragraphs in a specific order, keep that exact order
- Only modify sentences, phrases, and details - NOT paragraph positions or order

IMPORTANT RULES:
- Return ONLY the optimized cover letter text
- Do NOT include markdown code blocks or explanations
- Do NOT change greeting, closing, or signature format
- Only modify text content within paragraphs - NOT paragraph positions
- Use ONLY data from the personal information provided - ignore any content in the original template
- Keep the exact same formatting, structure, and PARAGRAPH ORDER as the template
- If a paragraph in the template has placeholder content, replace it with relevant data from personal info
- If personal info doesn't have data for a paragraph, keep the paragraph structure but adapt it appropriately

Return the complete optimized cover letter:`;

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

    // Try providers with automatic fallback on auth failures
    let response;
    let lastError: Error | null = null;
    const triedProviders: string[] = [];

    for (let i = 0; i < providerPriority.length; i++) {
      const { name, model } = providerPriority[i];
      const provider = availableProviders.find(p => p.name === name);
      
      if (!provider || triedProviders.includes(name)) continue;

      try {
        triedProviders.push(name);
        response = await provider.call(messages, {
          model,
          temperature: 0.4, // Slightly higher for more natural writing
          maxTokens: 4096,
          stream: false,
        });
        // Success! Break out of loop
        break;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        
        // If it's an auth error, try next provider
        if (errorMessage.includes('Authentication') || 
            errorMessage.includes('Invalid Authentication') ||
            errorMessage.includes('401') || 
            errorMessage.includes('403') ||
            errorMessage.includes('API key')) {
          console.warn(`[Cover Letter Optimize] ${name} auth failed, trying next provider...`);
          continue; // Try next provider
        }
        
        // For other errors (rate limit, quota, etc.), also try next provider
        if (errorMessage.includes('rate limit') || 
            errorMessage.includes('429') ||
            errorMessage.includes('quota') ||
            errorMessage.includes('funding')) {
          console.warn(`[Cover Letter Optimize] ${name} failed (${errorMessage}), trying next provider...`);
          continue;
        }
        
        // For unexpected errors, still try next provider but log it
        console.warn(`[Cover Letter Optimize] ${name} error: ${errorMessage}, trying next provider...`);
        continue;
      }
    }

    // If we tried all providers and none worked
    if (!response) {
      const errorMsg = lastError?.message || 'All providers failed';
      return NextResponse.json(
        { 
          error: `Failed to optimize cover letter. Tried: ${triedProviders.join(', ')}. Last error: ${errorMsg}`,
          triedProviders 
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

