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

export interface PersonalInfo {
  id?: number;
  category: 'experience' | 'project' | 'education' | 'skill' | 'resume' | 'general' | 'achievement' | 'contact';
  title: string;
  content: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    startDate?: string;
    endDate?: string;
    company?: string;
    location?: string;
    technologies?: string[];
    url?: string;
    [key: string]: any;
  };
}

export interface ResumeTemplate {
  id?: number;
  latexContent: string;
  updatedAt: number;
}

export interface CoverLetterTemplate {
  id?: number;
  textContent: string;
  updatedAt: number;
}

export interface Memory {
  id?: number;
  memoryId: string;
  fact: string;
  category?: string;
  importance: number; // 1-10, higher = more important
  createdAt: number;
  updatedAt: number;
  lastAccessed: number;
  accessCount: number;
  tags?: string[];
  metadata?: {
    source?: string; // Which conversation it came from
    context?: string; // Additional context
    [key: string]: any;
  };
}

class EmbeddingDatabase extends Dexie {
  documents!: Table<Document>;
  chunks!: Table<DocumentChunk>;
  conversations!: Table<Conversation>;
  messages!: Table<ChatMessage>;
  personalInfo!: Table<PersonalInfo>;
  resumeTemplate!: Table<ResumeTemplate>;
  coverLetterTemplate!: Table<CoverLetterTemplate>;
  memories!: Table<Memory>;

  constructor() {
    super('EmbeddingDatabase');
    this.version(6).stores({
      documents: '++id, documentId, name, uploadedAt',
      chunks: '++id, documentId, chunkIndex, [documentId+chunkIndex]',
      conversations: '++id, conversationId, createdAt, updatedAt',
      messages: '++id, conversationId, messageId, timestamp, [conversationId+timestamp]',
      personalInfo: '++id, category, title, createdAt, updatedAt, *tags',
      resumeTemplate: '++id, updatedAt',
      coverLetterTemplate: '++id, updatedAt',
      memories: '++id, memoryId, createdAt, updatedAt, lastAccessed, *tags',
    });
  }
}

export const db = new EmbeddingDatabase();

