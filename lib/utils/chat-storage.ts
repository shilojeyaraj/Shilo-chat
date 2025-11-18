import { db, Conversation, ChatMessage } from '@/lib/db';

/**
 * Chat history storage utilities
 * Uses IndexedDB (already set up) - no external database needed!
 */

/**
 * Create a new conversation
 */
export async function createConversation(title?: string): Promise<string> {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();

  await db.conversations.add({
    conversationId,
    title: title || `Conversation ${new Date(now).toLocaleString()}`,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  });

  return conversationId;
}

/**
 * Save a message to the database
 */
export async function saveMessage(
  conversationId: string,
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: any;
    sources?: any[];
  }
): Promise<void> {
  await db.messages.add({
    conversationId,
    messageId: message.id,
    role: message.role,
    content: message.content,
    timestamp: Date.now(),
    metadata: {
      ...message.metadata,
      sources: message.sources,
    },
  });

  // Update conversation
  const conversation = await db.conversations
    .where('conversationId')
    .equals(conversationId)
    .first();

  if (conversation) {
    await db.conversations.update(conversation.id!, {
      updatedAt: Date.now(),
      messageCount: await db.messages
        .where('conversationId')
        .equals(conversationId)
        .count(),
    });
  }
}

/**
 * Load messages for a conversation
 */
export async function loadMessages(conversationId: string): Promise<ChatMessage[]> {
  return db.messages
    .where('conversationId')
    .equals(conversationId)
    .sortBy('timestamp');
}

/**
 * Get all conversations (sorted by most recent)
 */
export async function getAllConversations(): Promise<Conversation[]> {
  return db.conversations.orderBy('updatedAt').reverse().toArray();
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  await db.messages.where('conversationId').equals(conversationId).delete();
  await db.conversations.where('conversationId').equals(conversationId).delete();
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const conversation = await db.conversations
    .where('conversationId')
    .equals(conversationId)
    .first();

  if (conversation) {
    await db.conversations.update(conversation.id!, { title });
  }
}

/**
 * Search conversations by title or message content
 */
export async function searchConversations(query: string): Promise<Conversation[]> {
  const allConversations = await getAllConversations();
  const lowerQuery = query.toLowerCase();

  // Filter by title
  const titleMatches = allConversations.filter((conv) =>
    conv.title.toLowerCase().includes(lowerQuery)
  );

  // Also search message content
  const messageMatches: Conversation[] = [];
  for (const conv of allConversations) {
    const messages = await loadMessages(conv.conversationId);
    const hasMatch = messages.some((msg) =>
      msg.content.toLowerCase().includes(lowerQuery)
    );
    if (hasMatch && !titleMatches.includes(conv)) {
      messageMatches.push(conv);
    }
  }

  return [...titleMatches, ...messageMatches];
}

