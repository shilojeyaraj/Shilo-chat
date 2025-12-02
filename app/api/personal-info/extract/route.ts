import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/llm/providers';
import { Message } from '@/lib/llm/types';

/**
 * Extract structured personal information from uploaded files
 * Uses AI to parse resumes, CVs, and other documents
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string || file.type;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse file content
    let textContent = '';
    
    if (fileType === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Parse PDF
      const pdfParse = await import('pdf-parse');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const data = await pdfParse.default(buffer);
      textContent = data.text;
    } else if (fileType.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      // Parse text file
      textContent = await file.text();
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, TXT, or MD files.' },
        { status: 400 }
      );
    }

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'File appears to be empty or could not be parsed' },
        { status: 400 }
      );
    }

    // Use AI to extract structured information
    const extractionPrompt = `You are an expert at extracting structured information from resumes, CVs, and personal documents.

Extract the following information from the document and return it as JSON. If information is not found, use null or empty arrays.

Document content:
${textContent.substring(0, 8000)}${textContent.length > 8000 ? '...' : ''}

Return a JSON object with this structure:
{
  "contact": {
    "name": "Full name",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, State/Country",
    "linkedin": "LinkedIn URL if found",
    "github": "GitHub URL if found",
    "website": "Personal website URL if found"
  },
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "location": "Location",
      "startDate": "Start date (e.g., 'Jan 2020' or '2020')",
      "endDate": "End date (e.g., 'Present', 'Dec 2023', or '2023')",
      "description": "Job description and key achievements"
    }
  ],
  "education": [
    {
      "degree": "Degree name (e.g., 'Bachelor of Science in Computer Science')",
      "institution": "University/School name",
      "location": "Location",
      "graduationDate": "Graduation date (e.g., '2020' or 'May 2020')",
      "gpa": "GPA if mentioned",
      "description": "Additional details"
    }
  ],
  "skills": [
    "List of technical skills, programming languages, tools, etc."
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "Project description",
      "technologies": ["List of technologies used"],
      "url": "Project URL if available"
    }
  ],
  "achievements": [
    "List of achievements, awards, certifications, etc."
  ],
  "summary": "Professional summary or objective if present"
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, just the JSON object.`;

    // Use Claude or GPT-4 for better extraction (they're better at structured output)
    const availableProviders = Object.values(providers).filter(p => p.isAvailable());
    
    // Try providers in order of preference for extraction quality
    let bestProvider = availableProviders.find(p => p.name === 'Kimi');
    if (!bestProvider) {
      bestProvider = availableProviders.find(p => p.name === 'Anthropic');
    }
    if (!bestProvider) {
      bestProvider = availableProviders.find(p => p.name === 'Groq');
    }
    if (!bestProvider) {
      bestProvider = availableProviders[0];
    }

    if (!bestProvider) {
      return NextResponse.json(
        { error: 'No AI provider available. Please configure API keys.' },
        { status: 500 }
      );
    }

    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that extracts structured information from documents. Always return valid JSON only.',
      },
      {
        role: 'user',
        content: extractionPrompt,
      },
    ];

    // Determine model based on provider - use correct model names
    let model = '';
    if (bestProvider.name === 'Anthropic') {
      // Try common Claude model names
      model = 'claude-3-5-sonnet-20241022'; // Try the dated version first
    } else if (bestProvider.name === 'Kimi') {
      model = 'moonshot-v1-128k'; // Kimi K2 is excellent for structured extraction
    } else if (bestProvider.name === 'Groq') {
      model = 'llama-3.3-70b-versatile';
    } else {
      model = 'moonshot-v1-128k'; // Default to Kimi
    }

    let response;
    try {
      response = await bestProvider.call(messages, {
        model,
        temperature: 0.3, // Lower temperature for more consistent extraction
        maxTokens: 4096,
        stream: false,
      });
    } catch (error: any) {
      // If Anthropic model fails, try alternative model names
      if (bestProvider.name === 'Anthropic' && error.message?.includes('model')) {
        console.log('Trying alternative Anthropic model names...');
        const alternativeModels = [
          'claude-3-5-sonnet-20240620', // Alternative dated version
          'claude-3-5-sonnet', // Without date
          'claude-3-opus-20240229', // Fallback to Opus
          'claude-3-sonnet-20240229', // Older Sonnet version
        ];
        
        let lastError = error;
        for (const altModel of alternativeModels) {
          try {
            console.log(`Trying model: ${altModel}`);
            response = await bestProvider.call(messages, {
              model: altModel,
              temperature: 0.3,
              maxTokens: 4096,
              stream: false,
            });
            console.log(`Success with model: ${altModel}`);
            break; // Success, exit loop
          } catch (altError: any) {
            lastError = altError;
            continue; // Try next model
          }
        }
        
        // If all Anthropic models failed, try Kimi as fallback
        if (!response) {
          const kimiProvider = availableProviders.find(p => p.name === 'Kimi');
          if (kimiProvider) {
            console.log('Falling back to Kimi...');
            try {
              response = await kimiProvider.call(messages, {
                model: 'moonshot-v1-128k',
                temperature: 0.3,
                maxTokens: 4096,
                stream: false,
              });
            } catch (kimiError: any) {
              throw new Error(`All extraction attempts failed. Last error: ${lastError.message || lastError}`);
            }
          } else {
            throw new Error(`Anthropic model error: ${lastError.message || lastError}. No Kimi fallback available.`);
          }
        }
      } else {
        // For non-Anthropic errors, try Kimi as fallback
        const kimiProvider = availableProviders.find(p => p.name === 'Kimi');
        if (kimiProvider && bestProvider.name !== 'Kimi') {
          console.log('Falling back to Kimi due to error...');
          try {
            response = await kimiProvider.call(messages, {
              model: 'moonshot-v1-128k',
              temperature: 0.3,
              maxTokens: 4096,
              stream: false,
            });
          } catch (fallbackError: any) {
            throw new Error(`Extraction failed: ${error.message || error}. Fallback also failed: ${fallbackError.message || fallbackError}`);
          }
        } else {
          throw error;
        }
      }
    }

    // Parse the response (LLMResponse has a content field)
    let extractedData: any;
    try {
      // The response should be an LLMResponse with a content field
      const responseText = response.content || '';

      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      // Remove markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       responseText.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
      } else {
        extractedData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Failed to parse extraction response:', parseError);
      console.error('Response:', response);
      return NextResponse.json(
        { 
          error: 'Failed to extract structured data',
          details: 'AI response could not be parsed as JSON. Please try uploading a different file or manually enter your information.',
          rawText: textContent.substring(0, 1000) // Return first 1000 chars as fallback
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
      rawText: textContent.substring(0, 500), // Include first 500 chars for reference
    });

  } catch (error: any) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to extract information',
        details: error.message || String(error)
      },
      { status: 500 }
    );
  }
}

