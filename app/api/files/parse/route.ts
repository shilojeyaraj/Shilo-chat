import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Unified file parsing API - supports multiple file formats
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 20MB' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    let result: {
      text: string;
      pages?: number;
      info?: any;
      metadata?: any;
    };

    // Determine file type and parse accordingly
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // PDF parsing
      const data = await pdf(buffer);
      result = {
        text: data.text,
        pages: data.numpages,
        info: data.info,
      };
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword' ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')
    ) {
      // DOCX/DOC parsing
      try {
        const result_docx = await mammoth.extractRawText({ buffer });
        result = {
          text: result_docx.value,
          metadata: {
            messages: result_docx.messages,
            warnings: result_docx.messages.filter((m: any) => m.type === 'warning'),
          },
        };
      } catch (error) {
        // Fallback: try to extract text from DOC format (limited support)
        return NextResponse.json(
          { error: 'Failed to parse DOCX/DOC file. Please ensure it is a valid Word document.', details: String(error) },
          { status: 400 }
        );
      }
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      fileType === 'application/vnd.ms-powerpoint' ||
      fileName.endsWith('.pptx') ||
      fileName.endsWith('.ppt')
    ) {
      // PPTX/PPT parsing - extract text from slides
      // Note: Full PPTX parsing requires more complex libraries, this is a basic implementation
      try {
        // For PPTX, we'll use a simple approach: try to extract text from XML
        // This is a basic implementation - full PPTX parsing would require pptxgenjs or similar
        const text = extractTextFromPPTX(buffer);
        result = {
          text: text || 'Unable to extract text from PowerPoint file. Full PPTX parsing requires additional libraries.',
          metadata: {
            format: 'pptx',
            note: 'Basic text extraction only. Complex formatting may not be preserved.',
          },
        };
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to parse PPTX/PPT file', details: String(error) },
          { status: 400 }
        );
      }
    } else if (
      fileType === 'text/plain' ||
      fileType === 'text/markdown' ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.markdown')
    ) {
      // Plain text / Markdown
      result = {
        text: buffer.toString('utf-8'),
      };
    } else if (
      fileType === 'text/csv' ||
      fileName.endsWith('.csv')
    ) {
      // CSV parsing
      const csvText = buffer.toString('utf-8');
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      // Convert to readable text format
      let text = '';
      if (parsed.data.length > 0) {
        const headers = Object.keys(parsed.data[0] as any);
        text += `CSV Data (${parsed.data.length} rows, ${headers.length} columns):\n\n`;
        text += `Headers: ${headers.join(', ')}\n\n`;
        
        // Include first 100 rows as text
        const rowsToInclude = parsed.data.slice(0, 100);
        rowsToInclude.forEach((row: any, index: number) => {
          text += `Row ${index + 1}: ${headers.map((h) => `${h}=${row[h] || ''}`).join(', ')}\n`;
        });
        
        if (parsed.data.length > 100) {
          text += `\n... and ${parsed.data.length - 100} more rows`;
        }
      }

      result = {
        text,
        metadata: {
          rowCount: parsed.data.length,
          columns: parsed.data.length > 0 ? Object.keys(parsed.data[0] as any) : [],
          errors: parsed.errors,
        },
      };
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')
    ) {
      // Excel parsing
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      
      workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        text += `Sheet ${index + 1}: ${sheetName}\n`;
        text += `${'='.repeat(50)}\n\n`;
        
        // Convert to text format
        jsonData.forEach((row: any, rowIndex: number) => {
          if (Array.isArray(row)) {
            text += row.map((cell: any) => String(cell || '')).join(' | ') + '\n';
          }
        });
        
        text += '\n';
      });

      result = {
        text,
        metadata: {
          sheetCount: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames,
        },
      };
    } else if (
      fileType === 'application/json' ||
      fileName.endsWith('.json')
    ) {
      // JSON parsing
      try {
        const jsonText = buffer.toString('utf-8');
        const json = JSON.parse(jsonText);
        result = {
          text: JSON.stringify(json, null, 2),
          metadata: {
            type: 'json',
          },
        };
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid JSON file', details: String(error) },
          { status: 400 }
        );
      }
    } else if (fileType.startsWith('image/')) {
      // Image files - return base64 data for vision models
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${fileType};base64,${base64}`;
      
      return NextResponse.json({
        text: '', // No text extracted
        isImage: true,
        imageData: dataUrl,
        metadata: {
          type: fileType,
          size: file.size,
        },
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileType}. Supported formats: PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, JSON, images` },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('File parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse file', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Basic PPTX text extraction from XML
 * This is a simplified implementation - full PPTX parsing would require dedicated libraries
 */
function extractTextFromPPTX(buffer: Buffer): string {
  try {
    // PPTX files are ZIP archives containing XML files
    // This is a very basic implementation that tries to extract text from XML
    const bufferString = buffer.toString('binary');
    
    // Look for text content in XML tags (basic regex approach)
    const textMatches = bufferString.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
    if (textMatches) {
      return textMatches
        .map((match) => {
          const textMatch = match.match(/<a:t[^>]*>([^<]+)<\/a:t>/);
          return textMatch ? textMatch[1] : '';
        })
        .filter((text) => text.trim().length > 0)
        .join('\n');
    }
    
    return '';
  } catch (error) {
    console.error('PPTX extraction error:', error);
    return '';
  }
}

