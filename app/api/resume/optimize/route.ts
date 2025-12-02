import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/llm/providers';
import { Message } from '@/lib/llm/types';

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

    const prompt = `You are an expert resume optimizer. Your task is to optimize a LaTeX resume for a specific job posting while PRESERVING THE EXACT LaTeX STRUCTURE, FORMATTING, AND SECTION ORDER.

CRITICAL REQUIREMENTS:
1. Keep ALL LaTeX commands, packages, document structure, and formatting EXACTLY as they are
2. PRESERVE THE EXACT ORDER OF SECTIONS (Education, Experience, Projects, Skills, etc.) - do NOT reorder sections
3. PRESERVE THE EXACT POSITION AND STRUCTURE of each section - keep sections in the same location
4. Only modify the CONTENT within sections (bullet points, descriptions, skill lists, experience descriptions)
5. Do NOT change any LaTeX syntax, commands, or structure
6. Use ONLY information from the user's personal information provided below - do NOT use any content from the original resume
7. Select and prioritize the most relevant experiences, skills, and projects from personal info that match the job posting
8. Rewrite bullet points and descriptions using ONLY the user's personal information
9. Keep the same section order, section positions, and LaTeX formatting
10. Preserve all special characters, escaping, and LaTeX syntax
11. If a section exists in the template (e.g., Education, Experience, Projects, Skills), keep it in the exact same position - only swap out the content/bullet points

USER'S PERSONAL INFORMATION (USE ONLY THIS DATA):
${personalInfoContext}

ORIGINAL LaTeX RESUME TEMPLATE (USE ONLY FOR STRUCTURE/FORMATTING):
${latexResume}

JOB POSTING:
${jobPosting}

TASK:
Optimize the resume content to match the job posting by:
- Selecting the most relevant experiences from personal info that match job requirements
- Selecting the most relevant skills from personal info that match job requirements
- Selecting the most relevant projects from personal info that match job requirements
- Rewriting bullet points using ONLY information from personal info
- Using keywords from the job posting in descriptions
- Keeping ALL LaTeX structure, commands, formatting, and SECTION ORDER identical to the template

CRITICAL SECTION ORDER RULES:
- Keep Education section in the exact same position as in the template
- Keep Experience section in the exact same position as in the template
- Keep Projects section in the exact same position as in the template
- Keep Skills section in the exact same position as in the template
- Keep all other sections in their exact same positions
- Do NOT reorder sections - only swap out the content within each section
- If the template has sections in order: Education, Experience, Projects, Skills - keep that exact order
- Only modify bullet points, descriptions, and content - NOT section positions or order

IMPORTANT RULES:
- Return ONLY the optimized LaTeX code
- Do NOT include markdown code blocks or explanations
- Do NOT change any \\documentclass, \\usepackage, or structural LaTeX commands
- Only modify text content within sections (experiences, skills, projects, etc.) - NOT section positions
- Use ONLY data from the personal information provided - ignore any content in the original resume
- Preserve all LaTeX escaping (\\, {, }, etc.)
- Keep the exact same formatting, structure, and SECTION ORDER as the template
- If a section in the template has placeholder content, replace it with relevant data from personal info
- If personal info doesn't have data for a section, keep the section structure but leave it minimal or remove content only

Return the complete optimized LaTeX resume:`;

    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are an expert LaTeX resume optimizer. You preserve LaTeX structure exactly and only optimize content using the user\'s personal information to match job requirements. You never use content from the original resume, only from the personal information database.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await bestProvider.call(messages, {
      model,
      temperature: 0.3,
      maxTokens: 16384, // LaTeX can be very long
      stream: false,
    });

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
    return NextResponse.json(
      { error: 'Failed to optimize resume', details: error.message },
      { status: 500 }
    );
  }
}

