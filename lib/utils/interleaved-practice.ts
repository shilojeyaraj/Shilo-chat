/**
 * Interleaved Practice Utilities
 * Mixes problem types from different topics for better retention
 */

import { StudyItem } from '@/lib/db';

export interface InterleavedProblemSet {
  problems: StudyItem[];
  currentTopic: string;
  previousTopics: string[];
  mixRatio: number; // 0.4 = 40% current, 60% previous
}

/**
 * Create interleaved problem set
 * Mixes problems from current topic (40%) and previous topics (60%)
 */
export function createInterleavedProblemSet(
  problems: StudyItem[],
  currentTopic: string,
  previousTopics: string[],
  count: number = 10,
  mixRatio: number = 0.4
): InterleavedProblemSet {
  // Separate problems by topic
  const currentProblems = problems.filter(p => p.topic === currentTopic);
  const previousProblems = problems.filter(p => previousTopics.includes(p.topic));
  
  // Calculate counts
  const currentCount = Math.ceil(count * mixRatio);
  const previousCount = count - currentCount;
  
  // Select problems
  const selectedCurrent = shuffleArray(currentProblems).slice(0, currentCount);
  const selectedPrevious = shuffleArray(previousProblems).slice(0, previousCount);
  
  // Combine and shuffle to interleave
  const allSelected = [...selectedCurrent, ...selectedPrevious];
  const shuffled = shuffleArray(allSelected);
  
  return {
    problems: shuffled,
    currentTopic,
    previousTopics,
    mixRatio,
  };
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Group problems by interleaving group (for related problem types)
 */
export function groupByInterleavingGroup(problems: StudyItem[]): Map<string, StudyItem[]> {
  const groups = new Map<string, StudyItem[]>();
  
  problems.forEach(problem => {
    const group = problem.interleavingGroup || 'ungrouped';
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(problem);
  });
  
  return groups;
}

/**
 * Create interleaved set from groups
 * Ensures problems from different groups are mixed
 */
export function createInterleavedFromGroups(
  groups: Map<string, StudyItem[]>,
  count: number = 10
): StudyItem[] {
  const allProblems: StudyItem[] = [];
  const groupKeys = Array.from(groups.keys());
  
  // Distribute problems evenly across groups
  const problemsPerGroup = Math.ceil(count / groupKeys.length);
  
  groupKeys.forEach(groupKey => {
    const groupProblems = shuffleArray(groups.get(groupKey) || []);
    allProblems.push(...groupProblems.slice(0, problemsPerGroup));
  });
  
  // Shuffle final array to interleave
  return shuffleArray(allProblems).slice(0, count);
}

/**
 * Get recommended previous topics for interleaving
 * Based on recency and difficulty
 */
export function getRecommendedPreviousTopics(
  studyItems: StudyItem[],
  currentTopic: string,
  count: number = 3
): string[] {
  // Get all unique topics except current
  const topicMap = new Map<string, { lastPracticed: number; difficulty: number; count: number }>();
  
  studyItems
    .filter(item => item.topic !== currentTopic)
    .forEach(item => {
      if (!topicMap.has(item.topic)) {
        topicMap.set(item.topic, {
          lastPracticed: item.lastReviewed,
          difficulty: item.difficulty,
          count: 0,
        });
      }
      const topicData = topicMap.get(item.topic)!;
      topicData.count++;
      // Update last practiced to most recent
      if (item.lastReviewed > topicData.lastPracticed) {
        topicData.lastPracticed = item.lastReviewed;
      }
    });
  
  // Sort by recency and difficulty (prioritize recent, difficult topics)
  const sortedTopics = Array.from(topicMap.entries())
    .sort((a, b) => {
      // Prioritize recent topics
      const recencyDiff = b[1].lastPracticed - a[1].lastPracticed;
      if (Math.abs(recencyDiff) > 7 * 24 * 60 * 60 * 1000) {
        // More than 7 days difference - prioritize recent
        return recencyDiff > 0 ? 1 : -1;
      }
      // Within 7 days - prioritize higher difficulty
      return b[1].difficulty - a[1].difficulty;
    })
    .slice(0, count)
    .map(([topic]) => topic);
  
  return sortedTopics;
}

