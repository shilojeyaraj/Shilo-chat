/**
 * Spaced Repetition Utilities
 * Implements SM-2 algorithm (Anki-style) for optimal review scheduling
 */

import { StudyItem } from '@/lib/db';

export interface ReviewResult {
  nextInterval: number; // Days until next review
  nextEaseFactor: number;
  nextReview: number; // Timestamp
}

/**
 * Calculate next review date using SM-2 algorithm
 * Quality: 0-5 (0=complete blackout, 5=perfect recall)
 */
export function calculateNextReview(
  easeFactor: number,
  interval: number,
  quality: number // 0-5
): ReviewResult {
  // SM-2 Algorithm
  if (quality < 3) {
    // Failed - restart
    return {
      nextInterval: 1,
      nextEaseFactor: Math.max(1.3, easeFactor - 0.2),
      nextReview: Date.now() + 1 * 24 * 60 * 60 * 1000, // 1 day
    };
  }

  // Calculate new ease factor
  const newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const clampedEaseFactor = Math.max(1.3, newEaseFactor);
  
  // Calculate new interval
  let newInterval: number;
  if (interval === 0) {
    newInterval = 1;
  } else if (interval === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * clampedEaseFactor);
  }

  return {
    nextInterval: newInterval,
    nextEaseFactor: clampedEaseFactor,
    nextReview: Date.now() + newInterval * 24 * 60 * 60 * 1000,
  };
}

/**
 * Get items due for review
 */
export async function getDueItems(studyItems: StudyItem[]): Promise<StudyItem[]> {
  const now = Date.now();
  return studyItems.filter(item => item.nextReview <= now);
}

/**
 * Update study item after review
 */
export function updateStudyItemAfterReview(
  item: StudyItem,
  quality: number // 0-5
): Partial<StudyItem> {
  const result = calculateNextReview(item.easeFactor, item.nextReview, quality);
  
  return {
    lastReviewed: Date.now(),
    nextReview: result.nextReview,
    reviewCount: item.reviewCount + 1,
    easeFactor: result.nextEaseFactor,
    masteryLevel: calculateMasteryLevel(item.masteryLevel, quality),
  };
}

/**
 * Calculate mastery level based on review quality
 */
function calculateMasteryLevel(currentMastery: number, quality: number): number {
  // Increase mastery based on quality
  const increase = quality * 5; // 0-25 points
  const decrease = quality < 3 ? 10 : 0; // Decrease if failed
  
  return Math.max(0, Math.min(100, currentMastery + increase - decrease));
}

/**
 * Get review schedule for next N days
 */
export function getReviewSchedule(studyItems: StudyItem[], days: number = 7): Map<number, StudyItem[]> {
  const schedule = new Map<number, StudyItem[]>();
  const now = Date.now();
  const endDate = now + days * 24 * 60 * 60 * 1000;
  
  studyItems.forEach(item => {
    if (item.nextReview <= endDate) {
      const day = Math.floor((item.nextReview - now) / (24 * 60 * 60 * 1000));
      const dayKey = Math.max(0, day);
      
      if (!schedule.has(dayKey)) {
        schedule.set(dayKey, []);
      }
      schedule.get(dayKey)!.push(item);
    }
  });
  
  return schedule;
}

