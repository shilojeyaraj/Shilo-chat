export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url' | 'image'; text?: string; image_url?: { url: string }; source?: { type: string; media_type: string; data: string } }>;
  images?: string[]; // Base64 images for convenience
}

export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

