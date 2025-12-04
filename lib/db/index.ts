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

export interface StudyItem {
  id?: number;
  type: 'formula' | 'concept' | 'problem' | 'definition' | 'worked_example';
  subject: string; // 'math' | 'physics' | 'statistics' | 'engineering'
  topic: string; // 'calculus' | 'thermodynamics' | etc.
  front: string; // Question/prompt/problem statement
  back: string; // Answer/explanation/solution
  difficulty: number; // 0-5
  lastReviewed: number;
  nextReview: number; // Calculated based on spaced repetition
  reviewCount: number;
  easeFactor: number; // For SM-2 algorithm (spaced repetition)
  masteryLevel: number; // 0-100
  tags: string[]; // For interleaving: ['integration', 'substitution', 'by-parts']
  interleavingGroup?: string; // Groups problems for interleaved practice
  source?: string; // 'textbook' | 'lecture' | 'generated'
  createdAt: number;
  updatedAt: number;
}

export interface StudySession {
  id?: number;
  subject: string;
  topic: string;
  technique: string; // 'interleaved' | 'worked_examples' | 'pbl' | 'active_recall' | etc.
  startTime: number;
  endTime?: number;
  itemsStudied: number;
  itemsCorrect: number;
  itemsIncorrect: number;
  confidenceRatings: number[]; // User's confidence ratings (1-5)
  difficultyRatings: number[]; // User's difficulty ratings (1-5)
  notes?: string;
  sessionPlan?: string; // JSON of planned activities
}

export interface StudyProgress {
  id?: number;
  subject: string;
  topic: string;
  masteryLevel: number; // 0-100
  lastPracticed: number;
  practiceCount: number;
  averageScore: number;
  interleavedPracticeCount: number;
  blockedPracticeCount: number;
  accuracy: number; // Overall accuracy percentage
  calibrationScore: number; // How well confidence matches performance
  updatedAt: number;
}

export interface ErrorLog {
  id?: number;
  subject: string;
  topic: string;
  error: string; // Description of the error
  category: 'formula_confusion' | 'conceptual_misunderstanding' | 'calculation_error' | 'strategy_error';
  timestamp: number;
  studyItemId?: number; // Link to study item if applicable
  resolved: boolean;
  resolvedAt?: number;
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
  studyItems!: Table<StudyItem>;
  studySessions!: Table<StudySession>;
  studyProgress!: Table<StudyProgress>;
  errorLog!: Table<ErrorLog>;

  constructor() {
    super('EmbeddingDatabase');
    this.version(7).stores({
      documents: '++id, documentId, name, uploadedAt',
      chunks: '++id, documentId, chunkIndex, [documentId+chunkIndex]',
      conversations: '++id, conversationId, createdAt, updatedAt',
      messages: '++id, conversationId, messageId, timestamp, [conversationId+timestamp]',
      personalInfo: '++id, category, title, createdAt, updatedAt, *tags',
      resumeTemplate: '++id, updatedAt',
      coverLetterTemplate: '++id, updatedAt',
      memories: '++id, memoryId, createdAt, updatedAt, lastAccessed, *tags',
      studyItems: '++id, subject, topic, nextReview, *tags',
      studySessions: '++id, subject, topic, startTime, endTime',
      studyProgress: '++id, subject, topic, lastPracticed, updatedAt',
      errorLog: '++id, subject, topic, timestamp, resolved',
    });
  }
}

export const db = new EmbeddingDatabase();

