/**
 * Quality Assessment Utility
 * Evaluates response quality to determine if fallback to better model is needed
 */

export interface QualityAssessment {
  quality: number; // 0-10 score
  shouldFallback: boolean;
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Assess response quality using heuristic rules
 * Returns quality score and whether fallback is recommended
 */
export function assessResponseQuality(
  userQuery: string,
  response: string,
  taskType: string
): QualityAssessment {
  const reasons: string[] = [];
  let qualityScore = 10; // Start with perfect score, deduct for issues

  // Basic checks
  if (!response || response.trim().length === 0) {
    return {
      quality: 0,
      shouldFallback: true,
      reasons: ['Empty response'],
      confidence: 'high',
    };
  }

  // Length-based quality (too short = likely incomplete)
  const responseLength = response.trim().length;
  const queryLength = userQuery.trim().length;
  
  if (responseLength < 50) {
    qualityScore -= 4;
    reasons.push('Response too short (< 50 chars)');
  } else if (responseLength < queryLength * 0.5 && queryLength > 100) {
    // Response is less than half the query length for long queries
    qualityScore -= 2;
    reasons.push('Response disproportionately short');
  }

  // Check for uncertainty/incapacity indicators
  const uncertaintyPatterns = [
    /i don't know/i,
    /i can't/i,
    /i'm unable/i,
    /i cannot/i,
    /i'm not sure/i,
    /i'm uncertain/i,
    /i don't have/i,
    /i don't understand/i,
    /unable to/i,
    /cannot help/i,
    /sorry, i/i,
  ];

  const hasUncertainty = uncertaintyPatterns.some(pattern => pattern.test(response));
  if (hasUncertainty) {
    qualityScore -= 3;
    reasons.push('Contains uncertainty/incapacity statements');
  }

  // Check for low confidence indicators
  const lowConfidencePatterns = [
    /\bmight\b/i,
    /\bpossibly\b/i,
    /\bperhaps\b/i,
    /\bmaybe\b/i,
    /\buncertain\b/i,
    /\bnot sure\b/i,
    /\bprobably\b/i,
  ];

  const lowConfidenceCount = (response.match(new RegExp(lowConfidencePatterns.map(p => p.source).join('|'), 'gi')) || []).length;
  if (lowConfidenceCount > 3) {
    qualityScore -= 2;
    reasons.push(`Too many uncertainty words (${lowConfidenceCount})`);
  }

  // Check if response addresses the question
  const questionWords = userQuery.toLowerCase().match(/\b(what|why|how|when|where|who|which|explain|describe|tell me|show me)\b/gi);
  if (questionWords && questionWords.length > 0) {
    // Check if response contains question-related keywords
    const queryKeywords = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const responseLower = response.toLowerCase();
    const matchingKeywords = queryKeywords.filter(kw => responseLower.includes(kw)).length;
    const keywordMatchRatio = queryKeywords.length > 0 ? matchingKeywords / queryKeywords.length : 1;
    
    if (keywordMatchRatio < 0.3) {
      qualityScore -= 3;
      reasons.push('Response doesn\'t address key query terms');
    }
  }

  // Task-specific quality checks
  if (taskType === 'code_generation' || taskType === 'code_editing') {
    // Check for code completeness
    const codeBlocks = response.match(/```[\s\S]*?```/g) || [];
    if (codeBlocks.length > 0) {
      // Check for common incomplete code indicators
      const incompletePatterns = [
        /\/\/ TODO/i,
        /\/\/ FIXME/i,
        /\/\/ .../i,
        /# TODO/i,
        /# FIXME/i,
        /pass\s*$/m, // Python placeholder
        /\.\.\./g, // Ellipsis
      ];
      
      const hasIncomplete = incompletePatterns.some(pattern => 
        codeBlocks.some(block => pattern.test(block))
      );
      
      if (hasIncomplete) {
        qualityScore -= 2;
        reasons.push('Code contains TODO/FIXME or incomplete sections');
      }

      // Check for syntax errors (basic checks)
      const syntaxErrors = [
        /function\s*\([^)]*$/m, // Unclosed function params
        /\{[^}]*$/m, // Unclosed braces (simple check)
        /\([^)]*$/m, // Unclosed parentheses (simple check)
      ];
      
      const hasSyntaxIssues = syntaxErrors.some(pattern =>
        codeBlocks.some(block => {
          const code = block.replace(/```[\w]*\n?/g, '').trim();
          const lines = code.split('\n');
          return lines.some(line => pattern.test(line) && !line.trim().endsWith(')') && !line.trim().endsWith('}'));
        })
      );
      
      if (hasSyntaxIssues) {
        qualityScore -= 2;
        reasons.push('Code may contain syntax issues');
      }
    } else if (taskType === 'code_generation' && /code|function|class|implement|write/i.test(userQuery)) {
      // User asked for code but got none
      qualityScore -= 4;
      reasons.push('Code requested but no code blocks in response');
    }
  }

  if (taskType === 'reasoning' || taskType === 'data_analysis') {
    // For reasoning tasks, check for depth
    const hasExplanation = /because|since|therefore|thus|hence|as a result|due to|reason|explanation/i.test(response);
    const hasAnalysis = /analyze|analysis|examine|evaluate|consider|compare|contrast/i.test(response);
    
    if (!hasExplanation && !hasAnalysis && responseLength < 200) {
      qualityScore -= 3;
      reasons.push('Reasoning task lacks depth or explanation');
    }
  }

  if (taskType === 'web_search' || taskType === 'deep_research') {
    // Check for citations or sources
    const hasSources = /source|reference|citation|according to|from|https?:\/\//i.test(response);
    if (!hasSources && responseLength > 100) {
      qualityScore -= 1;
      reasons.push('Research response lacks source citations');
    }
  }

  // Check for repetition (sign of low quality)
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 3) {
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase().substring(0, 50)));
    const repetitionRatio = 1 - (uniqueSentences.size / sentences.length);
    if (repetitionRatio > 0.3) {
      qualityScore -= 2;
      reasons.push('Response contains significant repetition');
    }
  }

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (qualityScore <= 4 || reasons.length >= 3) {
    confidence = 'high'; // High confidence that fallback is needed
  } else if (qualityScore >= 8 && reasons.length === 0) {
    confidence = 'high'; // High confidence that quality is good
  } else {
    confidence = 'medium';
  }

  // Threshold: fallback if quality < 7
  const shouldFallback = qualityScore < 7;

  return {
    quality: Math.max(0, Math.min(10, qualityScore)),
    shouldFallback,
    reasons: reasons.length > 0 ? reasons : ['Quality acceptable'],
    confidence,
  };
}

/**
 * Quick quality check (lighter version for streaming responses)
 */
export function quickQualityCheck(response: string): boolean {
  if (!response || response.trim().length < 30) return false;
  
  const uncertaintyPatterns = [
    /i don't know/i,
    /i can't/i,
    /i'm unable/i,
    /cannot help/i,
  ];
  
  return !uncertaintyPatterns.some(pattern => pattern.test(response));
}

