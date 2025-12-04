/**
 * Type definitions for API routes
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'image_url' | 'image';
    text?: string;
    image_url?: { url: string };
  }>;
  timestamp?: number;
  images?: string[];
}

export interface FileData {
  type: string;
  name: string;
  data?: string;
  content?: string;
  path?: string;
  url?: string;
}

export interface RAGChunk {
  documentName: string;
  text: string;
  score?: number;
}

export interface ToolResult {
  [key: string]: any;
}

export interface ChatRequestBody {
  messages: ChatMessage[];
  files?: FileData[];
  userOverride?: string;
  useRAG?: boolean;
  mode?: 'primary' | 'coding' | 'study';
  deepWebSearch?: boolean;
  personalInfoContext?: string;
  memoryContext?: string;
}


