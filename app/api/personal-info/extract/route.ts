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

    // Parse file content - support multiple formats
    let textContent = '';
    const fileName = file.name.toLowerCase();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // PDF
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        const pdfParse = await import('pdf-parse');
        const data = await pdfParse.default(buffer);
        textContent = data.text;
      }
      // DOCX
      else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileType === 'application/msword' || 
               fileName.endsWith('.docx') || 
               fileName.endsWith('.doc')) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value;
      }
      // TXT, MD
      else if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        textContent = buffer.toString('utf-8');
      }
      // CSV
      else if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
        const Papa = await import('papaparse');
        const csvText = buffer.toString('utf-8');
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        // Convert CSV to readable text
        if (parsed.data.length > 0) {
          const headers = Object.keys(parsed.data[0] as any);
          textContent = `CSV Data:\nHeaders: ${headers.join(', ')}\n\n`;
          parsed.data.slice(0, 50).forEach((row: any, index: number) => {
            textContent += `Row ${index + 1}: ${headers.map((h) => `${h}=${row[h] || ''}`).join(', ')}\n`;
          });
        }
      }
      // JSON
      else if (fileType === 'application/json' || fileName.endsWith('.json')) {
        try {
          const json = JSON.parse(buffer.toString('utf-8'));
          textContent = JSON.stringify(json, null, 2);
        } catch {
          textContent = buffer.toString('utf-8');
        }
      }
      // Unsupported
      else {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload PDF, DOCX, TXT, MD, CSV, or JSON files.' },
          { status: 400 }
        );
      }
    } catch (parseError: any) {
      console.error('File parsing error:', parseError);
      return NextResponse.json(
        { error: `Failed to parse file: ${parseError.message || parseError}. Please ensure the file is not corrupted.` },
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

    // Use Groq for extraction (simple and reliable)
    const groqProvider = providers.groq;
    
    console.log('[Personal Info Extract] Checking Groq provider availability...');
    console.log('[Personal Info Extract] Groq provider exists:', !!groqProvider);
    console.log('[Personal Info Extract] Groq isAvailable:', groqProvider?.isAvailable());
    
    if (!groqProvider || !groqProvider.isAvailable()) {
      console.error('[Personal Info Extract] Groq provider not available. GROQ_API_KEY is required.');
      return NextResponse.json(
        { error: 'GROQ_API_KEY is required for extraction. Please add it to Vercel environment variables.' },
        { status: 500 }
      );
    }

    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that extracts structured information from documents. Always return valid JSON only. Do not include markdown code blocks, just the raw JSON object.',
      },
      {
        role: 'user',
        content: extractionPrompt,
      },
    ];

    // Use Groq's Llama 3.3 70B model
    const model = 'llama-3.3-70b-versatile';

    console.log('[Personal Info Extract] Using Groq provider with model:', model);
    console.log('[Personal Info Extract] Request config:', {
      model,
      temperature: 0.2,
      maxTokens: 8192,
    });

    let response;
    try {
      response = await groqProvider.call(messages, {
        model,
        temperature: 0.2, // Lower temperature for more consistent, structured extraction
        maxTokens: 8192, // More tokens for comprehensive extraction
        stream: false,
      });
      console.log('[Personal Info Extract] Groq extraction successful');
    } catch (error: any) {
      console.error('Groq extraction error:', error);
      const errorMessage = error.message || String(error);
      
      // Provide more specific error messages
      if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Invalid') || errorMessage.includes('Authentication')) {
        throw new Error(
          `Authentication failed. Please check that GROQ_API_KEY is set correctly in Vercel environment variables and you have redeployed.`
        );
      }
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        throw new Error(
          `Rate limit exceeded. Please try again in a few moments.`
        );
      }
      
      throw new Error(
        `Failed to extract information: ${errorMessage}. ` +
        `Please ensure GROQ_API_KEY is configured correctly.`
      );
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
      
      // Check for authentication errors
      if (error.message?.includes('Invalid Authentication') || error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('Authentication Failed') || error.message?.includes('GROQ_API_KEY')) {
        return NextResponse.json(
          { 
            error: 'API authentication failed',
            details: error.message || 'Please check that GROQ_API_KEY is set correctly in Vercel environment variables and you have redeployed after adding it.'
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to extract information',
          details: error.message || String(error)
        },
        { status: 500 }
      );
    }
}

