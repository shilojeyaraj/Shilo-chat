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
 * Parse PDF Tool - Extract text from PDF files
 */
const parsePdfTool: Tool = {
  name: 'parse_pdf',
  description: 'Extract and read text content from PDF files',
  parameters: {
    file_path: 'string - path to PDF file or file data',
  },
  execute: async ({ file_path, file_data }, context) => {
    // If file_data is provided (from upload), use it directly
    if (file_data) {
      const pdf = await import('pdf-parse');
      const buffer = Buffer.from(file_data, 'base64');
      const data = await pdf.default(buffer);
      return {
        text: data.text,
        pages: data.numpages,
        info: data.info,
      };
    }

    // Otherwise, try to fetch from URL or file path
    let dataBuffer: Buffer;
    if (file_path?.startsWith('http')) {
      const response = await fetch(file_path);
      dataBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      // For server-side file system access
      const fs = await import('fs');
      dataBuffer = fs.readFileSync(file_path);
    }

    const pdf = await import('pdf-parse');
    const data = await pdf.default(dataBuffer);
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info,
    };
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
  parsePdfTool,
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

  // PDF parsing
  if (files.some((f) => f.type === 'application/pdf')) {
    requiredTools.push('parse_pdf');
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
    case 'parse_pdf':
      const pdfFile = context.files?.find((f: any) => f.type === 'application/pdf');
      if (pdfFile?.data) {
        return { file_data: pdfFile.data };
      }
      return { file_path: pdfFile?.path || pdfFile?.url };
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

