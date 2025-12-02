/**
 * Persistent Memory System
 * Stores and retrieves facts across conversations
 */

import { db, Memory } from '@/lib/db';

export interface MemoryFact {
  fact: string;
  category?: string;
  importance?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Add a new memory/fact
 */
export async function addMemory(memory: MemoryFact, source?: string): Promise<string> {
  const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();

  const memoryRecord: Memory = {
    memoryId,
    fact: memory.fact,
    category: memory.category || 'general',
    importance: memory.importance || 5,
    createdAt: now,
    updatedAt: now,
    lastAccessed: now,
    accessCount: 0,
    tags: memory.tags || [],
    metadata: {
      ...memory.metadata,
      source: source || 'unknown',
    },
  };

  await db.memories.add(memoryRecord);
  return memoryId;
}

/**
 * Search memories by query (simple text search)
 */
export async function searchMemories(query: string, limit: number = 10): Promise<Memory[]> {
  const queryLower = query.toLowerCase();
  
  // Search in fact text, category, and tags
  const allMemories = await db.memories
    .orderBy('lastAccessed')
    .reverse()
    .toArray();

  const matchingMemories = allMemories.filter((mem) => {
    const factMatch = mem.fact.toLowerCase().includes(queryLower);
    const categoryMatch = mem.category?.toLowerCase().includes(queryLower);
    const tagMatch = mem.tags?.some((tag) => tag.toLowerCase().includes(queryLower));
    
    return factMatch || categoryMatch || tagMatch;
  });

  // Sort by relevance (importance + recency)
  matchingMemories.sort((a, b) => {
    const scoreA = a.importance + (a.lastAccessed / 10000000000); // Recency boost
    const scoreB = b.importance + (b.lastAccessed / 10000000000);
    return scoreB - scoreA;
  });

  // Update access count and last accessed
  const toUpdate = matchingMemories.slice(0, limit);
  for (const mem of toUpdate) {
    await db.memories.update(mem.id!, {
      lastAccessed: Date.now(),
      accessCount: (mem.accessCount || 0) + 1,
    });
  }

  return matchingMemories.slice(0, limit);
}

/**
 * Get all memories (for context)
 */
export async function getAllMemories(limit: number = 20): Promise<Memory[]> {
  const memories = await db.memories
    .orderBy('importance')
    .reverse()
    .limit(limit)
    .toArray();
  
  return memories;
}

/**
 * Get recent memories
 */
export async function getRecentMemories(limit: number = 10): Promise<Memory[]> {
  const memories = await db.memories
    .orderBy('lastAccessed')
    .reverse()
    .limit(limit)
    .toArray();
  
  return memories;
}

/**
 * Update a memory
 */
export async function updateMemory(memoryId: string, updates: Partial<MemoryFact>): Promise<void> {
  const memory = await db.memories.where('memoryId').equals(memoryId).first();
  if (!memory) return;

  await db.memories.update(memory.id!, {
    fact: updates.fact || memory.fact,
    category: updates.category || memory.category,
    importance: updates.importance !== undefined ? updates.importance : memory.importance,
    tags: updates.tags || memory.tags,
    updatedAt: Date.now(),
    metadata: {
      ...memory.metadata,
      ...updates.metadata,
    },
  });
}

/**
 * Delete a memory
 */
export async function deleteMemory(memoryId: string): Promise<void> {
  await db.memories.where('memoryId').equals(memoryId).delete();
}

/**
 * Extract potential memories from conversation
 * This is a simple implementation - could be enhanced with AI
 */
export function extractPotentialMemories(userMessage: string, assistantResponse: string): MemoryFact[] {
  const memories: MemoryFact[] = [];
  
  // Simple heuristics to extract facts
  // Look for statements like "I am...", "My name is...", "I like...", etc.
  const patterns = [
    /(?:my|i am|i'm|i have|i like|i prefer|i work|i study|i live|i'm from)\s+([^.!?]+)/gi,
    /(?:name is|called|named)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /(?:favorite|favourite|prefer|like)\s+([^.!?]+)/gi,
  ];

  const text = `${userMessage} ${assistantResponse}`;
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 5) {
        memories.push({
          fact: match[1].trim(),
          category: 'personal',
          importance: 5,
        });
      }
    }
  }

  return memories;
}

/**
 * Format memories for context (to include in system prompt)
 */
export function formatMemoriesForContext(memories: Memory[]): string {
  if (memories.length === 0) return '';

  const formatted = memories.map((mem, index) => {
    return `${index + 1}. ${mem.fact}${mem.category ? ` (${mem.category})` : ''}`;
  }).join('\n');

  return `\n\nUser's remembered information:\n${formatted}\n`;
}

