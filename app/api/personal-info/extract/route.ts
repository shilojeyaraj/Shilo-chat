import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/llm/providers';
import { Message } from '@/lib/llm/types';
import { routeAgentToOptimalLLM, getAgentFallbackChain } from '@/lib/llm/agent-router';
import { getExtractionPrompt } from '@/lib/prompts/agent-prompts';

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

    // Use agent-specific routing for extraction
    // Optimal: GPT-4o (fast multimodal, excellent structured output)
    const config = routeAgentToOptimalLLM('extract', {});
    const fallbackChain = getAgentFallbackChain('extract');

    // Use optimized extraction prompt
    const extractionPrompt = getExtractionPrompt(textContent);

    // Use OpenRouter for extraction (unified access to all models)
    const openRouterProvider = providers.openrouter;
    
    if (!openRouterProvider || !openRouterProvider.isAvailable()) {
      console.error('[Personal Info Extract] OpenRouter provider not available. OPEN_ROUTER_KEY is required.');
      return NextResponse.json(
        { error: 'OPEN_ROUTER_KEY is required for extraction. Please add it to Vercel environment variables.' },
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

    // Use agent config (GPT-4o optimal for extraction)
    const modelsToTry = [config, ...fallbackChain].map(c => c.model);
    let response;
    let lastError: Error | null = null;
    const triedModels: string[] = [];

    for (const model of modelsToTry) {
      if (triedModels.includes(model)) continue;

      try {
        triedModels.push(model);
        const modelConfig = [config, ...fallbackChain].find(c => c.model === model) || config;

        response = await openRouterProvider.call(messages, {
          model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens || 8192,
          stream: false,
        });
        
        break;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        
        console.warn(`[Personal Info Extract] ${model} failed: ${errorMessage}`);
        
        // Try next model in fallback chain
        if (modelsToTry.indexOf(model) < modelsToTry.length - 1) {
          continue;
        }
        
        // If this was the last model, throw the error
        throw error;
      }
    }

    if (!response) {
      throw lastError || new Error('All models failed for extraction');
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
      if (error.message?.includes('Invalid Authentication') || error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('Authentication Failed') || error.message?.includes('OPEN_ROUTER_KEY')) {
        return NextResponse.json(
          { 
            error: 'API authentication failed',
            details: error.message || 'Please check that OPEN_ROUTER_KEY is set correctly in Vercel environment variables and you have redeployed after adding it.'
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

