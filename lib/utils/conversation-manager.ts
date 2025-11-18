/**
 * Hot-Warm-Cold Conversation Management
 * 
 * Efficiently manages conversation context by:
 * - Hot: Recent messages (last 10) - full content
 * - Warm: Medium-old messages (11-30) - compressed/summarized
 * - Cold: Very old messages (31+) - highly summarized or excluded
 */

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  images?: string[];
  summary?: string; // For warm/cold messages
}

export interface ConversationContext {
  hot: ConversationMessage[]; // Last 10 messages - full
  warm: ConversationMessage[]; // Messages 11-30 - compressed
  cold: ConversationMessage[]; // Messages 31+ - highly summarized
  summary: string; // Overall conversation summary
}

const HOT_THRESHOLD = 10; // Keep last 10 messages in full
const WARM_THRESHOLD = 30; // Keep messages 11-30 compressed
// Messages beyond 30 are in cold storage

/**
 * Compress a message by summarizing it
 */
function compressMessage(message: ConversationMessage): ConversationMessage {
  // Simple compression: keep first 200 chars + summary indicator
  if (message.content.length > 200) {
    return {
      ...message,
      summary: message.content.substring(0, 200) + '...',
      content: message.content.substring(0, 200) + '... [compressed]',
    };
  }
  return message;
}

/**
 * Generate a conversation summary for cold messages
 */
function generateConversationSummary(messages: ConversationMessage[]): string {
  if (messages.length === 0) return '';
  
  // Extract key topics and themes
  const topics: string[] = [];
  const userMessages = messages.filter(m => m.role === 'user');
  
  // Simple keyword extraction
  const allText = userMessages.map(m => m.content).join(' ');
  const words = allText.toLowerCase().split(/\s+/);
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were']);
  const keywords = words
    .filter(w => w.length > 4 && !commonWords.has(w))
    .slice(0, 10);
  
  return `Previous conversation covered: ${keywords.join(', ')}`;
}

/**
 * Organize messages into hot-warm-cold structure
 */
export function organizeConversation(messages: ConversationMessage[]): ConversationContext {
  const total = messages.length;
  
  // Hot: Last 10 messages (full)
  const hot = messages.slice(-HOT_THRESHOLD);
  
  // Warm: Messages 11-30 (compressed)
  const warmStart = Math.max(0, total - WARM_THRESHOLD);
  const warm = messages.slice(warmStart, total - HOT_THRESHOLD);
  
  // Cold: Messages before warm (highly summarized)
  const cold = messages.slice(0, warmStart);
  
  return {
    hot,
    warm,
    cold,
    summary: '', // Will be generated if needed
  };
}

/**
 * Build optimized context for API call
 * Combines hot (full) + warm (compressed) + cold (summary)
 */
export function buildOptimizedContext(
  messages: ConversationMessage[],
  maxTokens: number = 8000
): ConversationMessage[] {
  const organized = organizeConversation(messages);
  
  // Always include hot messages (full)
  const optimized: ConversationMessage[] = [...organized.hot];
  
  // Add warm messages (compressed) if we have token budget
  const warmCompressed = organized.warm.map(msg => compressMessage(msg));
  optimized.push(...warmCompressed);
  
  // Add cold summary if we still have budget and there are cold messages
  if (organized.cold.length > 0) {
    const summary = generateConversationSummary(organized.cold);
    if (summary) {
      optimized.unshift({
        role: 'system',
        content: `[Conversation Summary - ${organized.cold.length} earlier messages]: ${summary}`,
        timestamp: Date.now(),
      });
    }
  }
  
  // Estimate tokens and trim if needed
  let totalTokens = estimateTokens(optimized.map(m => m.content).join(' '));
  if (totalTokens > maxTokens) {
    // Keep hot messages, trim warm messages
    const hotTokens = estimateTokens(organized.hot.map(m => m.content).join(' '));
    const remainingBudget = maxTokens - hotTokens;
    
    // Only include warm messages that fit
    const trimmed: ConversationMessage[] = [...organized.hot];
    let warmTokens = 0;
    for (const msg of warmCompressed) {
      const msgTokens = estimateTokens(msg.content);
      if (warmTokens + msgTokens <= remainingBudget) {
        trimmed.push(msg);
        warmTokens += msgTokens;
      } else {
        break;
      }
    }
    
    return trimmed;
  }
  
  return optimized;
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Check if we need to compress based on token budget
 */
export function needsCompression(messages: ConversationMessage[], maxTokens: number): boolean {
  const totalText = messages.map(m => m.content).join(' ');
  const estimatedTokens = estimateTokens(totalText);
  return estimatedTokens > maxTokens;
}

