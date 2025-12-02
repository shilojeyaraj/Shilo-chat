import { db, PersonalInfo } from '@/lib/db';

/**
 * Personal Information Storage Utilities
 * Store and manage personal info (projects, experience, resume, etc.)
 */

/**
 * Add or update personal information
 */
export async function savePersonalInfo(
  info: Omit<PersonalInfo, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }
): Promise<number> {
  const now = Date.now();
  const id = info.id;
  
  if (id) {
    // Update existing
    await db.personalInfo.update(id, {
      ...info,
      updatedAt: now,
    });
    return id;
  } else {
    // Create new
    const newId = await db.personalInfo.add({
      ...info,
      createdAt: now,
      updatedAt: now,
    });
    return newId as number;
  }
}

/**
 * Get all personal information, optionally filtered by category
 */
export async function getPersonalInfo(category?: PersonalInfo['category']): Promise<PersonalInfo[]> {
  if (category) {
    return await db.personalInfo.where('category').equals(category).sortBy('updatedAt');
  }
  return await db.personalInfo.orderBy('updatedAt').reverse().toArray();
}

/**
 * Get personal info by ID
 */
export async function getPersonalInfoById(id: number): Promise<PersonalInfo | undefined> {
  return await db.personalInfo.get(id);
}

/**
 * Delete personal information
 */
export async function deletePersonalInfo(id: number): Promise<void> {
  await db.personalInfo.delete(id);
}

/**
 * Search personal information by keyword
 */
export async function searchPersonalInfo(query: string): Promise<PersonalInfo[]> {
  const lowerQuery = query.toLowerCase();
  const allInfo = await db.personalInfo.toArray();
  
  return allInfo.filter((info) => {
    const titleMatch = info.title.toLowerCase().includes(lowerQuery);
    const contentMatch = info.content.toLowerCase().includes(lowerQuery);
    const tagMatch = info.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
    return titleMatch || contentMatch || tagMatch;
  });
}

/**
 * Get personal info formatted for AI context
 * Returns a formatted string that can be included in system prompts
 */
export async function getPersonalInfoContext(): Promise<string> {
  const allInfo = await getPersonalInfo();
  
  if (allInfo.length === 0) {
    return '';
  }

  // Group by category
  const grouped: Record<string, PersonalInfo[]> = {};
  allInfo.forEach(info => {
    if (!grouped[info.category]) {
      grouped[info.category] = [];
    }
    grouped[info.category].push(info);
  });

  let context = '\n\n[Personal Information About User]:\n';
  
  // Format each category
  Object.entries(grouped).forEach(([category, items]) => {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    context += `\n${categoryName}:\n`;
    
    items.forEach((item, index) => {
      context += `\n${index + 1}. ${item.title}\n`;
      if (item.metadata) {
        if (item.metadata.company) context += `   Company: ${item.metadata.company}\n`;
        if (item.metadata.startDate || item.metadata.endDate) {
          const dateRange = [item.metadata.startDate, item.metadata.endDate]
            .filter(Boolean)
            .join(' - ');
          context += `   Period: ${dateRange}\n`;
        }
        if (item.metadata.location) context += `   Location: ${item.metadata.location}\n`;
        if (item.metadata.technologies && item.metadata.technologies.length > 0) {
          context += `   Technologies: ${item.metadata.technologies.join(', ')}\n`;
        }
        if (item.metadata.url) context += `   URL: ${item.metadata.url}\n`;
      }
      context += `   ${item.content}\n`;
      if (item.tags && item.tags.length > 0) {
        context += `   Tags: ${item.tags.join(', ')}\n`;
      }
    });
  });

  return context;
}

/**
 * Get relevant personal info based on query (simple keyword matching)
 */
export async function getRelevantPersonalInfo(query: string, limit: number = 5): Promise<PersonalInfo[]> {
  const lowerQuery = query.toLowerCase();
  const allInfo = await getPersonalInfo();
  
  // Score each item based on relevance
  const scored = allInfo.map(info => {
    let score = 0;
    const titleLower = info.title.toLowerCase();
    const contentLower = info.content.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/);
    
    queryWords.forEach(word => {
      if (titleLower.includes(word)) score += 3;
      if (contentLower.includes(word)) score += 1;
      if (info.tags?.some(tag => tag.toLowerCase().includes(word))) score += 2;
      if (info.metadata?.technologies?.some(tech => tech.toLowerCase().includes(word))) score += 2;
    });
    
    return { info, score };
  });
  
  // Sort by score and return top results
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.info);
}

