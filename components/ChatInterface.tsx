'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FileText, X, Search, Code, Zap, Brain, Sparkles, TrendingUp, Globe, MessageSquare, Plus, Menu, Settings, Image as ImageIcon, Copy, Trash2, RefreshCw, Download } from 'lucide-react';
import MessageContent from './MessageContent';
import toast from 'react-hot-toast';
import PdfUpload from './PdfUpload';
import { 
  createConversation, 
  saveMessage, 
  loadMessages, 
  getAllConversations, 
  deleteConversation,
  updateConversationTitle 
} from '@/lib/utils/chat-storage';
import { db, Conversation } from '@/lib/db';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  images?: string[]; // Base64 image data
  sources?: Array<{ documentName: string; text: string }>;
  metadata?: {
    taskType?: string;
    model?: string;
    provider?: string;
    providerName?: string;
    toolsUsed?: string[];
    costPer1M?: number;
  };
}

interface CostData {
  session: number;
  monthly: number;
  lastReset: number;
}

// Model options will be loaded dynamically based on available providers
const DEFAULT_MODEL_OPTIONS = [
  { value: '', label: 'Auto-select (recommended)' },
  { value: 'groq/llama-3.1-8b-instant', label: 'Llama 8B (Fastest)' },
  { value: 'groq/llama-3.3-70b-versatile', label: 'Llama 70B (Balanced)' },
  { value: 'anthropic/claude-3-5-sonnet-20241022', label: 'Claude 3.5 (Best)' },
  { value: 'openai/gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
  { value: 'perplexity/llama-3.1-sonar-large-128k-online', label: 'Perplexity (Search)' },
];

const PROVIDER_COLORS: Record<string, string> = {
  groq: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  openai: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  anthropic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  perplexity: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const TASK_ICONS: Record<string, any> = {
  web_search: Search,
  code_generation: Code,
  code_editing: Code,
  reasoning: Brain,
  quick_qa: Zap,
  creative_writing: Sparkles,
  data_analysis: TrendingUp,
  long_context: FileText,
  vision: Globe,
  general: Brain,
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useRAG, setUseRAG] = useState(true);
  const [userOverride, setUserOverride] = useState('');
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState(DEFAULT_MODEL_OPTIONS);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // Base64 images
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<'primary' | 'coding'>('primary');
  const [costData, setCostData] = useState<CostData>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('costData');
      if (stored) {
        const data = JSON.parse(stored);
        // Reset monthly if it's a new month
        const now = Date.now();
        const lastReset = data.lastReset || now;
        const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
        if (lastReset < monthAgo) {
          return { session: 0, monthly: 0, lastReset: now };
        }
        return data;
      }
    }
    return { session: 0, monthly: 0, lastReset: Date.now() };
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load available providers on mount
  useEffect(() => {
    const loadAvailableProviders = async () => {
      try {
        const response = await fetch('/api/providers');
        const data = await response.json();
        
        if (data.providers && data.providers.length > 0) {
          const availableKeys = new Set(data.providers.map((p: any) => p.key));
          
          // Filter model options to only show available providers
          const filtered = DEFAULT_MODEL_OPTIONS.filter((opt) => {
            if (opt.value === '') return true; // Always show auto-select
            const provider = opt.value.split('/')[0];
            return availableKeys.has(provider);
          });
          
          setModelOptions(filtered);
        }
      } catch (error) {
        console.error('Failed to load available providers:', error);
        // Keep default options if API fails
      }
    };

    loadAvailableProviders();
    loadConversations();
    
    // Load saved settings
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('defaultModel');
      const savedRAG = localStorage.getItem('useRAG');
      const savedMode = localStorage.getItem('chatMode') as 'primary' | 'coding' | null;
      if (savedModel) setUserOverride(savedModel);
      if (savedRAG !== null) setUseRAG(savedRAG === 'true');
      if (savedMode) setMode(savedMode);
    }
  }, []);

  // Load conversations list
  const loadConversations = async () => {
    try {
      const convs = await getAllConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  // Search conversations
  const [searchQuery, setSearchQuery] = useState('');
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create new conversation
  const handleNewConversation = async () => {
    const convId = await createConversation();
    setCurrentConversationId(convId);
    setMessages([]);
    await loadConversations();
    toast.success('New conversation started');
  };

  // Load conversation
  const handleLoadConversation = async (conversationId: string) => {
    try {
      const savedMessages = await loadMessages(conversationId);
      setMessages(savedMessages.map((msg) => ({
        id: msg.messageId,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        sources: msg.metadata?.sources,
        metadata: msg.metadata,
      })));
      setCurrentConversationId(conversationId);
      toast.success('Conversation loaded');
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      await deleteConversation(conversationId);
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      await loadConversations();
      toast.success('Conversation deleted');
    }
  };

  useEffect(() => {
    // Save cost data to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('costData', JSON.stringify(costData));
    }
  }, [costData]);

  const estimateCost = (tokens: number, costPer1M: number): number => {
    return (tokens / 1_000_000) * costPer1M;
  };

  // Handle image paste/upload
  const handleImagePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await handleImageFile(file);
        }
      }
    }
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedImages((prev) => [...prev, base64]);
      toast.success('Image added');
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(handleImageFile);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return;

    // Create conversation if needed
    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation();
      setCurrentConversationId(convId);
      await loadConversations();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      images: selectedImages.length > 0 ? selectedImages : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // Save user message
    await saveMessage(convId, userMessage);
    
    setInput('');
    setSelectedImages([]);
    setIsLoading(true);
    setActiveTools([]);

    try {
      // Prepare files for API
      const files = selectedImages.map((img, idx) => ({
        type: 'image/png', // Will be detected from base64
        data: img,
        name: `image-${idx}.png`,
      }));

      // Call the new intelligent chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
            images: m.images,
            timestamp: m.timestamp,
          })),
          files,
          useRAG,
          userOverride: userOverride || undefined,
          mode, // Pass mode to API
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || `API error: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      // Stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]' || !data) continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'metadata') {
                  // Update message with metadata
                  assistantMessage.metadata = {
                    taskType: parsed.taskType,
                    model: parsed.model,
                    provider: parsed.provider,
                    providerName: parsed.providerName,
                    toolsUsed: parsed.toolsUsed || [],
                    costPer1M: parsed.costPer1M,
                  };
                  setActiveTools(parsed.toolsUsed || []);

                  // Update UI
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...assistantMessage };
                    return updated;
                  });
                } else if (parsed.type === 'error') {
                  // Handle error from stream
                  assistantMessage.content = `❌ Error: ${parsed.error}`;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...assistantMessage };
                    return updated;
                  });
                  setIsLoading(false);
                  break;
                } else if (parsed.type === 'content') {
                  assistantMessage.content += parsed.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...assistantMessage };
                    return updated;
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e, data);
              }
            }
          }
        }

        // Estimate and update cost (rough estimate based on content length)
        if (assistantMessage.metadata?.costPer1M) {
          const estimatedTokens = (assistantMessage.content.length / 4) + (input.length / 4); // Rough estimate
          const cost = estimateCost(estimatedTokens, assistantMessage.metadata.costPer1M);
          setCostData((prev) => ({
            ...prev,
            session: prev.session + cost,
            monthly: prev.monthly + cost,
          }));
        }

        // Final save of complete assistant message
        if (convId) {
          await saveMessage(convId, {
            ...assistantMessage,
            sources: assistantMessage.sources,
          });
          await loadConversations(); // Update conversation list
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Check if it's a provider availability error
      if (error.message?.includes('not configured')) {
        toast.error(
          error.message || 'A required API key is missing. Please check your .env.local file.',
          { duration: 5000 }
        );
      } else {
        toast.error('Failed to get response. Please try again.');
      }
      
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      setActiveTools([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSend();
      }
    }
    // Cmd/Ctrl+Enter also works as backup
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSend();
      }
    }
  };

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'web_search':
        return <Search className="w-4 h-4" />;
      case 'parse_pdf':
        return <FileText className="w-4 h-4" />;
      case 'analyze_csv':
        return <TrendingUp className="w-4 h-4" />;
      case 'code_interpreter':
        return <Code className="w-4 h-4" />;
      case 'fetch_webpage':
        return <Globe className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getToolLabel = (toolName: string) => {
    const labels: Record<string, string> = {
      web_search: 'Searching web',
      parse_pdf: 'Parsing PDF',
      analyze_csv: 'Analyzing CSV',
      code_interpreter: 'Running code',
      fetch_webpage: 'Fetching webpage',
    };
    return labels[toolName] || toolName;
  };

  // Format timestamp for conversation list (e.g., "Today • 12m ago")
  const formatConversationTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = diffDays === 1;

    if (isToday) {
      return `Today • ${diffMins}m ago`;
    } else if (isYesterday) {
      return `Yesterday • ${diffHours % 24}h ago`;
    } else {
      const month = date.toLocaleString('default', { month: 'short' });
      const day = date.getDate();
      return `${month} ${day} • ${diffMins}m ago`;
    }
  };

  // Format time for message timestamps (e.g., "09:01 PM")
  const formatMessageTime = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Get current model display name
  const getCurrentModelDisplay = (): string => {
    if (messages.length === 0) return 'Llama 3.3 70B';
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant?.metadata?.model) {
      const model = lastAssistant.metadata.model;
      if (model.includes('70b') || model.includes('70B')) return 'Llama 3.3 70B';
      if (model.includes('8b') || model.includes('8B')) return 'Llama 3.1 8B';
      return model;
    }
    return 'Llama 3.3 70B';
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Recent Conversations */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
            RECENT
          </h2>
          {conversations.length > 0 && (
            <div className="mb-3 px-2">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="space-y-1">
            {(searchQuery ? filteredConversations : conversations.slice(0, 10)).map((conv) => (
              <div
                key={conv.conversationId}
                onClick={() => handleLoadConversation(conv.conversationId)}
                className={`
                  px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                  ${currentConversationId === conv.conversationId
                    ? 'bg-gray-700'
                    : 'hover:bg-gray-700/50'
                  }
                `}
              >
                <div className="text-sm font-medium text-white truncate mb-1">
                  {conv.title}
                </div>
                <div className="text-xs text-gray-400">
                  {formatConversationTime(conv.updatedAt)}
                </div>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-4">
                No conversations yet
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button 
            onClick={() => {
              if (messages.length === 0) {
                toast.error('No conversation to export');
                return;
              }
              const conversationText = messages.map(m => 
                `${m.role === 'user' ? 'You' : 'Assistant'}: ${m.content}`
              ).join('\n\n');
              const blob = new Blob([conversationText], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `conversation-${Date.now()}.md`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Conversation exported');
            }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
            disabled={messages.length === 0}
          >
            <Download className="w-4 h-4" />
            Export Chat
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mode Tabs */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-1 px-6 py-2">
            <button
              onClick={() => {
                setMode('primary');
                localStorage.setItem('chatMode', 'primary');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'primary'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Primary
            </button>
            <button
              onClick={() => {
                setMode('coding');
                localStorage.setItem('chatMode', 'coding');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'coding'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Code className="w-4 h-4 inline mr-1.5" />
              Coding
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">Shilo Chat</h1>
            <span className="text-sm text-gray-400">
              {getCurrentModelDisplay()} • ${costData.session.toFixed(2)}/1K tokens
            </span>
            {mode === 'coding' && (
              <span className="text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded">
                Multi-Agent Mode
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-900">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-4xl mb-4">
                  {mode === 'coding' ? '💻' : '👋'}
                </div>
                <p className="text-xl text-gray-300 mb-2">
                  {mode === 'coding' 
                    ? 'Coding Mode Active' 
                    : 'Hey! Welcome to Shilo Chat.'}
                </p>
                <p className="text-gray-400 mb-4">
                  {mode === 'coding'
                    ? 'I\'m your expert coding assistant. I can help with code generation, refactoring, debugging, architecture design, and more. I use multi-agent workflows and follow best practices from top coding tools.'
                    : 'How can I help you today?'}
                </p>
                {mode === 'coding' && (
                  <div className="text-sm text-gray-500 space-y-1 mt-4">
                    <p>• Production-ready code with error handling</p>
                    <p>• Multi-file architecture design</p>
                    <p>• Code review and optimization</p>
                    <p>• Best practices and design patterns</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {messages.map((message, msgIndex) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
            >
              <div className="max-w-2xl relative">
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  {/* Display images */}
                  {message.images && message.images.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {message.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Uploaded image ${idx + 1}`}
                          className="max-w-full h-auto rounded-lg"
                          style={{ maxHeight: '300px' }}
                        />
                      ))}
                    </div>
                  )}
                  {message.content && (
                    <MessageContent 
                      content={message.content} 
                      isCodingMode={mode === 'coding'}
                    />
                  )}
                </div>
                {/* Message actions */}
                <div className={`flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(message.content || '');
                      toast.success('Copied to clipboard');
                    }}
                    className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-300 transition-colors"
                    title="Copy message"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {message.role === 'assistant' && (
                    <button
                      onClick={async () => {
                        if (isLoading) return;
                        setIsLoading(true);
                        try {
                          const lastUserMessage = messages.slice(0, msgIndex).reverse().find(m => m.role === 'user');
                          if (!lastUserMessage) return;
                          
                          const response = await fetch('/api/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              messages: messages.slice(0, msgIndex).map(m => ({
                                role: m.role,
                                content: m.content,
                                images: m.images,
                                timestamp: m.timestamp,
                              })),
                              files: [],
                              useRAG,
                              userOverride: userOverride || undefined,
                              mode,
                            }),
                          });
                          
                          if (!response.ok) throw new Error('Failed to regenerate');
                          
                          const reader = response.body?.getReader();
                          const decoder = new TextDecoder();
                          let newContent = '';
                          
                          setMessages(prev => {
                            const updated = [...prev];
                            updated[msgIndex] = { ...updated[msgIndex], content: '' };
                            return updated;
                          });
                          
                          if (reader) {
                            while (true) {
                              const { done, value } = await reader.read();
                              if (done) break;
                              const chunk = decoder.decode(value);
                              const lines = chunk.split('\n');
                              for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                  const data = line.slice(6);
                                  if (data === '[DONE]') continue;
                                  try {
                                    const parsed = JSON.parse(data);
                                    if (parsed.type === 'content') {
                                      newContent += parsed.content;
                                      setMessages(prev => {
                                        const updated = [...prev];
                                        updated[msgIndex] = { ...updated[msgIndex], content: newContent };
                                        return updated;
                                      });
                                    }
                                  } catch {}
                                }
                              }
                            }
                          }
                        } catch (error) {
                          toast.error('Failed to regenerate');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-300 transition-colors"
                      title="Regenerate response"
                      disabled={isLoading}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMessages(prev => prev.filter((_, i) => i !== msgIndex));
                      toast.success('Message deleted');
                    }}
                    className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {message.timestamp && (
                    <span className="text-xs text-gray-500">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Image previews */}
            {selectedImages.length > 0 && (
              <div className="mb-3 flex gap-2 flex-wrap">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`Preview ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-600"
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onPaste={handleImagePaste}
                  placeholder="Type your message... (Paste images or click 📷 to upload)"
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600 placeholder-gray-400"
                  rows={1}
                  disabled={isLoading}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                multiple
              />
              <label
                htmlFor="image-upload"
                className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
              >
                <ImageIcon className="w-5 h-5 text-gray-300" />
              </label>
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && selectedImages.length === 0)}
                className="w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Send className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Free to use • No API key required
            </p>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Model
                  </label>
                  <select
                    value={userOverride}
                    onChange={(e) => {
                      setUserOverride(e.target.value);
                      localStorage.setItem('defaultModel', e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {modelOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Select a default model to use for all conversations
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={useRAG}
                      onChange={(e) => {
                        setUseRAG(e.target.checked);
                        localStorage.setItem('useRAG', String(e.target.checked));
                      }}
                      className="rounded"
                    />
                    <span>Enable RAG (Retrieval Augmented Generation)</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    Use uploaded documents to enhance responses
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Available Models</h3>
                  <div className="space-y-2 text-xs text-gray-400">
                    <div>• Groq: Llama 3.1 8B, Llama 3.3 70B (Fast & Cheap)</div>
                    <div>• Anthropic: Claude 3.5 Sonnet (Best Quality)</div>
                    <div>• OpenAI: GPT-4 Turbo, GPT-4 Vision (Premium)</div>
                    <div>• Perplexity: Sonar (Web Search)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
