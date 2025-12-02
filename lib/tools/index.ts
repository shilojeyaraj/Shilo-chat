export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, string>;
  execute: (params: any, context?: any) => Promise<any>;
}

/**
 * Web Search Tool - Search the web for current information
 */
const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for current information, news, facts, or real-time data',
  parameters: {
    query: 'string - the search query',
    num_results: 'number - how many results to return (default: 5)',
  },
  execute: async ({ query, num_results = 5 }) => {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      // Return empty results instead of throwing error
      return {
        results: [],
        error: 'BRAVE_SEARCH_API_KEY not configured. Web search is disabled.',
      };
    }

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${num_results}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      results: data.web?.results?.map((r: any) => ({
        title: r.title,
        url: r.url,
        description: r.description,
      })) || [],
    };
  },
};

/**
 * Parse File Tool - Extract text from various file formats
 * Supports: PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, JSON, images
 */
const parseFileTool: Tool = {
  name: 'parse_file',
  description: 'Extract and read text content from various file formats (PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, JSON, images)',
  parameters: {
    file_path: 'string - path to file or file data',
    file_type: 'string - MIME type of the file (optional)',
  },
  execute: async ({ file_path, file_data, file_type }, context) => {
    // Get file buffer
    let buffer: Buffer;
    let mimeType = file_type || 'application/octet-stream';
    let fileName = 'file';

    if (file_data) {
      // Handle base64 data URL format (data:type;base64,...)
      let base64Data = file_data;
      
      if (typeof file_data === 'string' && file_data.includes(',')) {
        // Extract MIME type and base64 part
        const parts = file_data.split(',');
        const dataUrlPrefix = parts[0];
        base64Data = parts[1];
        
        // Extract MIME type from data URL
        const mimeMatch = dataUrlPrefix.match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }
      
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch (error) {
        throw new Error(`Failed to decode base64: ${error}`);
      }
    } else if (file_path?.startsWith('http')) {
      const response = await fetch(file_path);
      buffer = Buffer.from(await response.arrayBuffer());
    } else if (file_path) {
      const fs = await import('fs');
      buffer = fs.readFileSync(file_path);
      fileName = file_path;
    } else {
      throw new Error('No file data or path provided');
    }

    // Parse based on file type
    const fileNameLower = fileName.toLowerCase();
    
    // PDF
    if (mimeType === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
      const pdf = await import('pdf-parse');
      const data = await pdf.default(buffer);
      return {
        text: data.text,
        pages: data.numpages,
        info: data.info,
      };
    }
    
    // DOCX/DOC
    if (mimeType.includes('word') || fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value,
        metadata: { messages: result.messages },
      };
    }
    
    // PPTX/PPT (basic text extraction)
    if (mimeType.includes('presentation') || fileNameLower.endsWith('.pptx') || fileNameLower.endsWith('.ppt')) {
      const bufferString = buffer.toString('binary');
      const textMatches = bufferString.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      const text = textMatches
        ? textMatches
            .map((match) => {
              const textMatch = match.match(/<a:t[^>]*>([^<]+)<\/a:t>/);
              return textMatch ? textMatch[1] : '';
            })
            .filter((text) => text.trim().length > 0)
            .join('\n')
        : 'Unable to extract text from PowerPoint file.';
      return { text, metadata: { format: 'pptx' } };
    }
    
    // Text files
    if (mimeType.startsWith('text/') || fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.md')) {
      return { text: buffer.toString('utf-8') };
    }
    
    // CSV
    if (mimeType === 'text/csv' || fileNameLower.endsWith('.csv')) {
      const Papa = await import('papaparse');
      const csvText = buffer.toString('utf-8');
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      
      let text = '';
      if (parsed.data.length > 0) {
        const headers = Object.keys(parsed.data[0] as any);
        text += `CSV Data (${parsed.data.length} rows, ${headers.length} columns):\n\n`;
        text += `Headers: ${headers.join(', ')}\n\n`;
        parsed.data.slice(0, 100).forEach((row: any, index: number) => {
          text += `Row ${index + 1}: ${headers.map((h) => `${h}=${row[h] || ''}`).join(', ')}\n`;
        });
        if (parsed.data.length > 100) {
          text += `\n... and ${parsed.data.length - 100} more rows`;
        }
      }
      
      return {
        text,
        metadata: {
          rowCount: parsed.data.length,
          columns: parsed.data.length > 0 ? Object.keys(parsed.data[0] as any) : [],
        },
      };
    }
    
    // Excel
    if (mimeType.includes('spreadsheet') || fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      
      workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        text += `Sheet ${index + 1}: ${sheetName}\n${'='.repeat(50)}\n\n`;
        jsonData.forEach((row: any) => {
          if (Array.isArray(row)) {
            text += row.map((cell: any) => String(cell || '')).join(' | ') + '\n';
          }
        });
        text += '\n';
      });
      
      return {
        text,
        metadata: {
          sheetCount: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames,
        },
      };
    }
    
    // JSON
    if (mimeType === 'application/json' || fileNameLower.endsWith('.json')) {
      try {
        const json = JSON.parse(buffer.toString('utf-8'));
        return {
          text: JSON.stringify(json, null, 2),
          metadata: { type: 'json' },
        };
      } catch (error) {
        throw new Error(`Invalid JSON: ${error}`);
      }
    }
    
    // Images
    if (mimeType.startsWith('image/')) {
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      return {
        text: '',
        isImage: true,
        imageData: dataUrl,
        metadata: { type: mimeType, size: buffer.length },
      };
    }
    
    throw new Error(`Unsupported file type: ${mimeType}`);
  },
};

/**
 * Parse PDF Tool - Legacy tool for backward compatibility
 */
const parsePdfTool: Tool = {
  name: 'parse_pdf',
  description: 'Extract and read text content from PDF files (legacy - use parse_file for all formats)',
  parameters: {
    file_path: 'string - path to PDF file or file data',
  },
  execute: async ({ file_path, file_data }, context) => {
    // Delegate to parse_file tool
    return parseFileTool.execute({ file_path, file_data, file_type: 'application/pdf' }, context);
  },
};

/**
 * Analyze CSV Tool - Parse and analyze CSV data
 */
const analyzeCsvTool: Tool = {
  name: 'analyze_csv',
  description: 'Parse and analyze CSV data, get column info and statistics',
  parameters: {
    csv_data: 'string - CSV content or file path',
  },
  execute: async ({ csv_data }) => {
    const Papa = await import('papaparse');

    const parsed = Papa.parse(csv_data, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      return { error: 'Failed to parse CSV', details: parsed.errors };
    }

    const columns = Object.keys(parsed.data[0] || {});
    const rowCount = parsed.data.length;

    // Basic stats for numeric columns
    const stats: Record<string, any> = {};
    columns.forEach((col) => {
      const values = parsed.data
        .map((row: any) => row[col])
        .filter((v: any) => typeof v === 'number');
      if (values.length > 0) {
        stats[col] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a: number, b: number) => a + b, 0) / values.length,
        };
      }
    });

    return {
      columns,
      rowCount,
      preview: parsed.data.slice(0, 10),
      stats,
    };
  },
};

/**
 * Code Interpreter Tool - Execute Python code (using E2B or similar)
 */
const codeInterpreterTool: Tool = {
  name: 'code_interpreter',
  description: 'Execute Python code in a sandbox and return results',
  parameters: {
    code: 'string - Python code to execute',
  },
  execute: async ({ code }) => {
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      // Fallback: return error message
      return {
        error: 'E2B_API_KEY not configured. Code execution requires E2B API.',
        note: 'You can set up E2B at https://e2b.dev',
      };
    }

    try {
      const response = await fetch('https://api.e2b.dev/v1/sandboxes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: 'python',
          code,
        }),
      });

      if (!response.ok) {
        throw new Error(`E2B API error: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        output: result.stdout,
        error: result.stderr,
        exitCode: result.exit_code,
      };
    } catch (error) {
      return {
        error: `Code execution failed: ${String(error)}`,
      };
    }
  },
};

/**
 * Fetch Webpage Tool - Extract text from web pages
 */
const fetchWebpageTool: Tool = {
  name: 'fetch_webpage',
  description: 'Fetch and extract text content from a webpage',
  parameters: {
    url: 'string - URL to fetch',
  },
  execute: async ({ url }) => {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const html = await response.text();
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);

      // Remove script and style tags
      $('script, style').remove();

      // Extract text
      const text = $('body').text()
        .replace(/\s+/g, ' ')
        .trim();

      return {
        url,
        text: text.slice(0, 10000), // Limit to 10k chars
        length: text.length,
        title: $('title').text(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch webpage: ${String(error)}`,
      };
    }
  },
};

export const tools: Tool[] = [
  webSearchTool,
  parseFileTool,
  parsePdfTool, // Keep for backward compatibility
  analyzeCsvTool,
  codeInterpreterTool,
  fetchWebpageTool,
];

/**
 * Detect which tools are required based on user message and files
 */
export async function detectRequiredTools(
  userMessage: string,
  files: any[] = []
): Promise<string[]> {
  const requiredTools: string[] = [];

  // Web search detection
  const searchTriggers = [
    'search', 'look up', 'find', 'latest', 'current', 'news', 'today',
    'weather', 'price', 'stock', 'trending', 'happening now'
  ];
  if (searchTriggers.some((trigger) => userMessage.toLowerCase().includes(trigger))) {
    requiredTools.push('web_search');
  }

  // File parsing (PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, JSON, images)
  const supportedFileTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/json',
  ];
  
  const supportedExtensions = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt', '.md', '.csv', '.xlsx', '.xls', '.json'];
  
  if (files.some((f) => {
    const fileName = (f.name || '').toLowerCase();
    return supportedFileTypes.includes(f.type) || 
           supportedExtensions.some(ext => fileName.endsWith(ext)) ||
           f.type?.startsWith('image/');
  })) {
    requiredTools.push('parse_file');
  }

  // CSV analysis
  if (files.some((f) => f.type === 'text/csv') || userMessage.includes('.csv')) {
    requiredTools.push('analyze_csv');
  }

  // Code execution (only if E2B key is available)
  if ((userMessage.includes('```python') || /run|execute this code|run code/i.test(userMessage)) 
      && process.env.E2B_API_KEY) {
    requiredTools.push('code_interpreter');
  }

  // Webpage fetching
  const urlRegex = /https?:\/\/[^\s]+/i;
  if (urlRegex.test(userMessage) && !requiredTools.includes('web_search')) {
    requiredTools.push('fetch_webpage');
  }

  return requiredTools;
}

/**
 * Execute tools and return results
 */
export async function executeTools(
  toolNames: string[],
  context: any
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  for (const toolName of toolNames) {
    const tool = tools.find((t) => t.name === toolName);
    if (!tool) continue;

    try {
      const params = extractToolParams(toolName, context);
      const result = await tool.execute(params, context);
      results[toolName] = result;
    } catch (error) {
      results[toolName] = { error: String(error) };
    }
  }

  return results;
}

/**
 * Extract tool parameters from context
 */
function extractToolParams(toolName: string, context: any): any {
  switch (toolName) {
    case 'web_search':
      return { query: context.userMessage, num_results: 5 };
    case 'parse_file':
      // Find any supported file
      const supportedFile = context.files?.find((f: any) => {
        const fileName = (f.name || '').toLowerCase();
        const supportedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-powerpoint',
          'text/plain',
          'text/markdown',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/json',
        ];
        const supportedExtensions = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt', '.md', '.csv', '.xlsx', '.xls', '.json'];
        return supportedTypes.includes(f.type) || 
               supportedExtensions.some(ext => fileName.endsWith(ext)) ||
               f.type?.startsWith('image/');
      });
      
      if (supportedFile?.data) {
        return { file_data: supportedFile.data, file_type: supportedFile.type };
      }
      if (supportedFile?.content) {
        return { file_data: supportedFile.content, file_type: supportedFile.type };
      }
      return { file_path: supportedFile?.path || supportedFile?.url, file_type: supportedFile?.type };
    case 'parse_pdf':
      // Legacy support - delegate to parse_file
      const pdfFile = context.files?.find((f: any) => f.type === 'application/pdf');
      if (pdfFile?.data) {
        return { file_data: pdfFile.data, file_type: 'application/pdf' };
      }
      if (pdfFile?.content) {
        return { file_data: pdfFile.content, file_type: 'application/pdf' };
      }
      return { file_path: pdfFile?.path || pdfFile?.url, file_type: 'application/pdf' };
    case 'analyze_csv':
      const csvFile = context.files?.find((f: any) => f.type === 'text/csv');
      return { csv_data: csvFile?.content || csvFile?.data };
    case 'code_interpreter':
      const codeMatch = context.userMessage.match(/```python\n([\s\S]*?)```/);
      return { code: codeMatch?.[1] || context.code || '' };
    case 'fetch_webpage':
      const urlMatch = context.userMessage.match(/https?:\/\/[^\s]+/);
      return { url: urlMatch?.[0] || '' };
    default:
      return {};
  }
}

