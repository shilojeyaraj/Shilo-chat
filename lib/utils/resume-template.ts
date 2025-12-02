import { db, ResumeTemplate } from '@/lib/db';

/**
 * Resume Template Storage Utilities
 * Store and retrieve LaTeX resume template
 */

const TEMPLATE_ID = 1; // Single template, always use ID 1

/**
 * Save resume template
 */
export async function saveResumeTemplate(latexContent: string): Promise<void> {
  const now = Date.now();
  
  const existing = await db.resumeTemplate.get(TEMPLATE_ID);
  
  if (existing) {
    await db.resumeTemplate.update(TEMPLATE_ID, {
      latexContent,
      updatedAt: now,
    });
  } else {
    await db.resumeTemplate.add({
      id: TEMPLATE_ID,
      latexContent,
      updatedAt: now,
    });
  }
}

/**
 * Get saved resume template
 */
export async function getResumeTemplate(): Promise<string | null> {
  const template = await db.resumeTemplate.get(TEMPLATE_ID);
  return template?.latexContent || null;
}

/**
 * Delete resume template
 */
export async function deleteResumeTemplate(): Promise<void> {
  await db.resumeTemplate.delete(TEMPLATE_ID);
}

