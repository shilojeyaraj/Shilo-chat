import { db, CoverLetterTemplate } from '@/lib/db';

/**
 * Cover Letter Template Storage Utilities
 * Store and retrieve cover letter template
 */

const TEMPLATE_ID = 1; // Single template, always use ID 1

/**
 * Save cover letter template
 */
export async function saveCoverLetterTemplate(textContent: string): Promise<void> {
  const now = Date.now();
  
  const existing = await db.coverLetterTemplate.get(TEMPLATE_ID);
  
  if (existing) {
    await db.coverLetterTemplate.update(TEMPLATE_ID, {
      textContent,
      updatedAt: now,
    });
  } else {
    await db.coverLetterTemplate.add({
      id: TEMPLATE_ID,
      textContent,
      updatedAt: now,
    });
  }
}

/**
 * Get saved cover letter template
 */
export async function getCoverLetterTemplate(): Promise<string | null> {
  const template = await db.coverLetterTemplate.get(TEMPLATE_ID);
  return template?.textContent || null;
}

/**
 * Delete cover letter template
 */
export async function deleteCoverLetterTemplate(): Promise<void> {
  await db.coverLetterTemplate.delete(TEMPLATE_ID);
}

