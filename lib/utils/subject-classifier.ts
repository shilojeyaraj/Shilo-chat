/**
 * Subject Classification and Study Method Selection
 * Automatically determines the best study method based on topic/subject
 */

export type SubjectCategory = 
  | 'quantitative'      // Math, Physics, Statistics, Engineering problems
  | 'conceptual'        // Biology, Chemistry, Theory-heavy subjects
  | 'programming'       // Coding, Software Engineering
  | 'mixed'             // General or mixed subjects
  | 'unknown';          // Cannot determine

export interface SubjectInfo {
  category: SubjectCategory;
  primaryMethod: string;
  secondaryMethods: string[];
  recommendedTimeBlocks: number; // minutes
  studyMode: 'problem_solving' | 'concept_mastery' | 'mixed';
}

/**
 * Classify a subject/topic and determine the best study method
 */
export function classifySubject(topic: string): SubjectInfo {
  const topicLower = topic.toLowerCase().trim();
  
  // Quantitative subjects (Math, Physics, Stats, Engineering)
  const quantitativeKeywords = [
    // Math
    'math', 'mathematics', 'calculus', 'algebra', 'geometry', 'trigonometry', 
    'linear algebra', 'differential', 'integral', 'derivative', 'equation',
    'statistics', 'stat', 'probability', 'regression', 'hypothesis',
    // Physics
    'physics', 'mechanics', 'thermodynamics', 'electromagnetism', 'optics',
    'quantum', 'kinematics', 'dynamics', 'force', 'energy', 'momentum',
    'circuit', 'electrical', 'magnetic', 'wave', 'oscillation',
    // Engineering
    'engineering', 'mechanical', 'electrical', 'civil', 'structural',
    'robotics', 'control system', 'signal processing', 'circuit analysis',
    // Problem-solving indicators
    'problem', 'solve', 'calculate', 'compute', 'formula', 'theorem'
  ];
  
  // Conceptual subjects (Biology, Chemistry, Theory)
  const conceptualKeywords = [
    // Biology
    'biology', 'bio', 'cell', 'genetics', 'molecular', 'biochemistry',
    'anatomy', 'physiology', 'ecology', 'evolution', 'organism',
    'krebs cycle', 'photosynthesis', 'respiration', 'dna', 'rna',
    // Chemistry
    'chemistry', 'chem', 'organic', 'inorganic', 'molecular orbital',
    'reaction', 'compound', 'molecule', 'atom', 'bond', 'periodic',
    // Theory-heavy
    'theory', 'concept', 'principle', 'framework', 'model', 'paradigm',
    'philosophy', 'psychology', 'sociology', 'history'
  ];
  
  // Programming subjects
  const programmingKeywords = [
    'programming', 'coding', 'code', 'software', 'algorithm', 'data structure',
    'python', 'javascript', 'java', 'c++', 'cpp', 'react', 'node',
    'function', 'class', 'variable', 'loop', 'recursion', 'debug',
    'api', 'database', 'sql', 'html', 'css', 'framework'
  ];
  
  // Check for quantitative subjects
  const isQuantitative = quantitativeKeywords.some(keyword => 
    topicLower.includes(keyword)
  );
  
  // Check for conceptual subjects
  const isConceptual = conceptualKeywords.some(keyword => 
    topicLower.includes(keyword)
  );
  
  // Check for programming subjects
  const isProgramming = programmingKeywords.some(keyword => 
    topicLower.includes(keyword)
  );
  
  // Determine category and methods
  if (isProgramming) {
    return {
      category: 'programming',
      primaryMethod: 'worked_examples',
      secondaryMethods: ['interleaved', 'self_explanation', 'pbl'],
      recommendedTimeBlocks: 50,
      studyMode: 'mixed'
    };
  }
  
  if (isQuantitative && !isConceptual) {
    return {
      category: 'quantitative',
      primaryMethod: 'interleaved',
      secondaryMethods: ['worked_examples', 'self_explanation', 'active_recall'],
      recommendedTimeBlocks: 50,
      studyMode: 'problem_solving'
    };
  }
  
  if (isConceptual && !isQuantitative) {
    return {
      category: 'conceptual',
      primaryMethod: 'feynman',
      secondaryMethods: ['blurting', 'active_recall', 'elaborative_interrogation'],
      recommendedTimeBlocks: 25,
      studyMode: 'concept_mastery'
    };
  }
  
  if (isQuantitative && isConceptual) {
    return {
      category: 'mixed',
      primaryMethod: 'feynman',
      secondaryMethods: ['interleaved', 'worked_examples', 'blurting'],
      recommendedTimeBlocks: 40,
      studyMode: 'mixed'
    };
  }
  
  // Default for unknown subjects
  return {
    category: 'unknown',
    primaryMethod: 'active_recall',
    secondaryMethods: ['feynman', 'worked_examples'],
    recommendedTimeBlocks: 30,
    studyMode: 'mixed'
  };
}

/**
 * Extract topic from a message
 * Tries to identify the main subject/topic being discussed
 */
export function extractTopic(message: string): string | null {
  const messageLower = message.toLowerCase();
  
  // Patterns to extract topics
  const patterns = [
    // "studying X", "learning X", "help me with X"
    /(?:studying|study|learning|learn|help.*with|want.*to.*study|need.*to.*learn)\s+([^,\.!?;]+?)(?:\.|,|!|\?|;|$|for|in|over)/i,
    // "X topic", "X subject", "X concept"
    /([^,\.!?;]+?)\s+(?:topic|subject|concept|chapter|unit|section)/i,
    // "I want to study X"
    /(?:i|we|i'm|i am)\s+(?:want|wanna|need|would like)\s+(?:to\s+)?(?:study|learn|review|practice)\s+([^,\.!?;]+?)(?:\.|,|!|\?|;|$|for|in|over)/i,
    // "Teach me X", "Explain X"
    /(?:teach|explain|help.*understand)\s+(?:me\s+)?([^,\.!?;]+?)(?:\.|,|!|\?|;|$|for|in|over)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const topic = match[1].trim();
      // Filter out common stop words and phrases
      const stopPhrases = ['about', 'how to', 'the', 'a', 'an', 'this', 'that'];
      if (topic.length > 2 && !stopPhrases.includes(topic.toLowerCase())) {
        return topic;
      }
    }
  }
  
  // If no pattern matches, try to extract key nouns (simple heuristic)
  // Remove common study-related words and extract remaining meaningful words
  const words = message.split(/\s+/);
  const studyWords = ['study', 'studying', 'learn', 'learning', 'help', 'me', 'with', 'want', 'to', 'need', 'teach', 'explain'];
  const meaningfulWords = words.filter(word => 
    word.length > 3 && 
    !studyWords.includes(word.toLowerCase()) &&
    !/^(the|a|an|this|that|is|are|was|were|be|been|being)$/i.test(word)
  );
  
  if (meaningfulWords.length > 0) {
    // Take first 2-3 meaningful words as topic
    return meaningfulWords.slice(0, 3).join(' ');
  }
  
  return null;
}

/**
 * Extract time information from a message
 */
export function extractTime(message: string): string | null {
  // Patterns for time extraction
  const timePatterns = [
    // "for X hours/minutes/days"
    /(?:for|in|over|next|within)\s+(\d+)\s+(hour|hr|minute|min|day|days|week|weeks|session|sessions)/i,
    // "X hours/minutes available"
    /(\d+)\s+(hour|hr|minute|min|day|days|week|weeks|session|sessions)\s+(?:available|to study|for studying)/i,
    // "I have X hours/minutes"
    /(?:i|we|i've|i have)\s+(?:got|have|have got)\s+(\d+)\s+(hour|hr|minute|min|day|days|week|weeks|session|sessions)/i,
  ];
  
  for (const pattern of timePatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[2]) {
      const amount = match[1];
      const unit = match[2].toLowerCase();
      return `${amount} ${unit}${amount !== '1' ? (unit.endsWith('s') ? '' : 's') : ''}`;
    }
  }
  
  return null;
}

