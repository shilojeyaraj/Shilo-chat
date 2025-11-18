import Dexie, { Table } from 'dexie';

export interface DocumentChunk {
  id?: number;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  metadata?: {
    page?: number;
    timestamp?: number;
  };
}

export interface Document {
  id?: number;
  documentId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  processed: boolean;
}

export interface Conversation {
  id?: number;
  conversationId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface ChatMessage {
  id?: number;
  conversationId: string;
  messageId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    taskType?: string;
    model?: string;
    provider?: string;
    providerName?: string;
    toolsUsed?: string[];
    costPer1M?: number;
    sources?: Array<{ documentName: string; text: string }>;
  };
}

class EmbeddingDatabase extends Dexie {
  documents!: Table<Document>;
  chunks!: Table<DocumentChunk>;
  conversations!: Table<Conversation>;
  messages!: Table<ChatMessage>;

  constructor() {
    super('EmbeddingDatabase');
    this.version(2).stores({
      documents: '++id, documentId, name, uploadedAt',
      chunks: '++id, documentId, chunkIndex, [documentId+chunkIndex]',
      conversations: '++id, conversationId, createdAt, updatedAt',
      messages: '++id, conversationId, messageId, timestamp, [conversationId+timestamp]',
    });
  }
}

export const db = new EmbeddingDatabase();

