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

    // Use Kimi or best available provider
    const availableProviders = Object.values(providers).filter(p => p.isAvailable());
    const bestProvider = availableProviders.find(p => p.name === 'Kimi') 
      || availableProviders.find(p => p.name === 'Anthropic')
      || availableProviders[0];

    if (!bestProvider) {
      return NextResponse.json(
        { error: 'No AI provider available. Please configure API keys.' },
        { status: 500 }
      );
    }

    const model = bestProvider.name === 'Kimi' 
      ? 'moonshot-v1-128k'
      : bestProvider.name === 'Anthropic'
      ? 'claude-3-5-sonnet-20241022'
      : 'llama-3.3-70b-versatile';

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

    const response = await bestProvider.call(messages, {
      model,
      temperature: 0.4, // Slightly higher for more natural writing
      maxTokens: 4096,
      stream: false,
    });

    let optimizedCoverLetter = response.content || '';

    // Clean up response (remove markdown code blocks if present)
    optimizedCoverLetter = optimizedCoverLetter.replace(/```(?:text|txt)?\n?/g, '').replace(/```\n?/g, '').trim();

    return NextResponse.json({ optimizedCoverLetter });

  } catch (error: any) {
    console.error('Cover letter optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize cover letter', details: error.message },
      { status: 500 }
    );
  }
}

