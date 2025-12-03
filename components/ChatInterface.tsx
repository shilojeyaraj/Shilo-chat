'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FileText, X, Search, Code, Zap, Brain, Sparkles, TrendingUp, Globe, MessageSquare, Plus, Menu, Settings, Image as ImageIcon, Copy, Trash2, RefreshCw, Download, Paperclip, User, Edit2, DollarSign, Calendar, ChevronDown, CheckSquare, Square, ArrowDown, AlertTriangle } from 'lucide-react';
import MessageContent from './MessageContent';
import toast from 'react-hot-toast';
import PdfUpload from './PdfUpload';
import PersonalInfoManager from './PersonalInfo';
import ResumeCustomizer from './ResumeCustomizer';
import FundingErrorModal from './FundingErrorModal';
import { 
  createConversation, 
  saveMessage, 
  loadMessages, 
  getAllConversations, 
  deleteConversation,
  updateConversationTitle 
} from '@/lib/utils/chat-storage';
import { normalizeForClipboard, normalizeOnPaste } from '@/lib/utils/text-normalization';
import { compressImages, estimateImageTokens } from '@/lib/utils/image-compression';
import { db, Conversation } from '@/lib/db';
import { 
  canSendMessage, 
  incrementMessageCount, 
  getRemainingMessages,
  getMessageLimit,
  getUsageData 
} from '@/lib/utils/usage-tracker';

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
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  };
}

interface CostData {
  session: number;
  monthly: number;
  lastReset: number;
}

// Model options will be loaded dynamically based on available providers
const DEFAULT_MODEL_OPTIONS = [
  { value: '', label: 'Auto-select (Kimi K2 default)' },
  { value: 'kimi/moonshot-v1-128k', label: 'Kimi K2 (Default)' },
  { value: 'groq/llama-3.1-8b-instant', label: 'Llama 8B (Fastest)' },
  { value: 'groq/llama-3.3-70b-versatile', label: 'Llama 70B (Balanced)' },
  { value: 'gemini/gemini-2.0-flash-exp', label: 'Gemini 2.0 (Vision - Best)' },
  { value: 'openai/gpt-4o', label: 'GPT-4o (Vision)' },
  { value: 'anthropic/claude-3-5-sonnet-20240620', label: 'Claude 3.5 (Vision/Files)' },
  { value: 'perplexity/llama-3.1-sonar-large-128k-online', label: 'Perplexity (Search)' },
];

const PROVIDER_COLORS: Record<string, string> = {
  groq: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  kimi: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  anthropic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  perplexity: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  openai: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  gemini: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
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
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showResumeCustomizer, setShowResumeCustomizer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [mode, setMode] = useState<'primary' | 'coding'>('primary');
  const [showFundingError, setShowFundingError] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ file: File; preview?: string; type: string; name: string }>>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [remainingMessages, setRemainingMessages] = useState(0); // Initialize to 0 to avoid hydration mismatch
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [deepWebSearch, setDeepWebSearch] = useState(false);
  // Initialize cost data to avoid hydration mismatch
  const [costData, setCostData] = useState<CostData>({ 
    session: 0, 
    monthly: 0, 
    lastReset: Date.now() 
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Load cost data from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('costData');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          // Reset monthly if it's a new month
          const now = Date.now();
          const lastReset = data.lastReset || now;
          const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
          if (lastReset < monthAgo) {
            setCostData({ session: 0, monthly: 0, lastReset: now });
          } else {
            setCostData(data);
          }
        } catch (error) {
          console.error('Failed to parse cost data:', error);
        }
      }
    }
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [budgetAlertsShown, setBudgetAlertsShown] = useState<Set<number>>(new Set());

  // Auto-resize textarea based on content (expands up to 1/3 of viewport height)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Calculate new height (min 48px, max 33vh - about 1/3 of viewport)
      const maxHeight = Math.min(window.innerHeight * 0.33, 400); // 1/3 of viewport, capped at 400px
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${Math.max(newHeight, 48)}px`; // At least 48px
      
      // Show scrollbar if content exceeds max height
      if (textarea.scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [input]);

  // Check if user is at bottom of messages
  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const threshold = 100; // 100px threshold
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(isNearBottom);
    setShowScrollButton(!isNearBottom && container.scrollHeight > container.clientHeight);
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Only auto-scroll if user is at bottom
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages, isAtBottom]);

  // Load budget from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('monthlyBudget');
      if (stored) {
        try {
          setMonthlyBudget(parseFloat(stored));
        } catch (error) {
          console.error('Failed to parse budget:', error);
        }
      }
    }
  }, []);

  // Check budget and show alerts
  useEffect(() => {
    if (monthlyBudget && costData.monthly > 0) {
      const percentage = (costData.monthly / monthlyBudget) * 100;
      const thresholds = [50, 75, 90, 100];
      
      thresholds.forEach(threshold => {
        if (percentage >= threshold && !budgetAlertsShown.has(threshold)) {
          const newAlerts = new Set(budgetAlertsShown);
          newAlerts.add(threshold);
          setBudgetAlertsShown(newAlerts);
          
          if (threshold === 100) {
            toast.error(
              `Budget exceeded! Monthly spending: $${costData.monthly.toFixed(2)} / $${monthlyBudget.toFixed(2)}`,
              { duration: 8000, icon: '⚠️' }
            );
          } else if (threshold === 90) {
            toast.error(
              `Budget 90% used! $${costData.monthly.toFixed(2)} / $${monthlyBudget.toFixed(2)}`,
              { duration: 6000, icon: '⚠️' }
            );
          } else {
            toast(
              `Budget ${threshold}% used: $${costData.monthly.toFixed(2)} / $${monthlyBudget.toFixed(2)}`,
              { duration: 4000, icon: '💰' }
            );
          }
        }
      });
    }
  }, [costData.monthly, monthlyBudget, budgetAlertsShown]);

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
        const savedDeepWebSearch = localStorage.getItem('deepWebSearch');
        if (savedModel) setUserOverride(savedModel);
        if (savedRAG !== null) setUseRAG(savedRAG === 'true');
        if (savedMode) setMode(savedMode);
        if (savedDeepWebSearch !== null) setDeepWebSearch(savedDeepWebSearch === 'true');
        
        // Check initial message limit
        setRemainingMessages(getRemainingMessages());
        if (!canSendMessage()) {
          setShowLimitModal(true);
        }
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
    if (multiSelectMode) {
      // Toggle selection in multi-select mode
      setSelectedConversations(prev => {
        const newSet = new Set(prev);
        if (newSet.has(conversationId)) {
          newSet.delete(conversationId);
        } else {
          newSet.add(conversationId);
        }
        return newSet;
      });
    } else {
      // Single delete mode
      setConversationToDelete(conversationId);
      setShowDeleteConfirm(true);
    }
  };

  // Bulk delete conversations
  const handleBulkDelete = async () => {
    if (selectedConversations.size === 0) return;
    
    const count = selectedConversations.size;
    const idsToDelete = Array.from(selectedConversations);
    
    try {
      // Delete all selected conversations
      for (const id of idsToDelete) {
        await deleteConversation(id);
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
      
      // Clear selection and exit multi-select mode
      setSelectedConversations(new Set());
      setMultiSelectMode(false);
      await loadConversations();
      toast.success(`${count} conversation${count > 1 ? 's' : ''} deleted`);
    } catch (error) {
      console.error('Failed to delete conversations:', error);
      toast.error('Failed to delete some conversations');
    }
  };

  // Toggle select all
  const handleSelectAll = () => {
    const visibleConversations = searchQuery ? filteredConversations : conversations.slice(0, 10);
    if (selectedConversations.size === visibleConversations.length) {
      setSelectedConversations(new Set());
    } else {
      setSelectedConversations(new Set(visibleConversations.map(c => c.conversationId)));
    }
  };

  // Toggle multi-select mode
  const toggleMultiSelectMode = () => {
    setMultiSelectMode(!multiSelectMode);
    setSelectedConversations(new Set());
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    await deleteConversation(conversationToDelete);
    if (currentConversationId === conversationToDelete) {
      setCurrentConversationId(null);
      setMessages([]);
    }
    await loadConversations();
    toast.success('Conversation deleted');
    setShowDeleteConfirm(false);
    setConversationToDelete(null);
  };

  // Generate title from first message
  const generateTitleFromMessage = (content: string): string => {
    // Remove markdown code blocks
    let text = content.replace(/```[\s\S]*?```/g, '').trim();
    // Remove markdown links
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Take first 50 characters
    if (text.length > 50) {
      text = text.substring(0, 50).trim() + '...';
    }
    
    return text || 'New Conversation';
  };

  // Update conversation title
  const handleUpdateTitle = async (conversationId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    try {
      await updateConversationTitle(conversationId, newTitle.trim());
      await loadConversations();
      setEditingTitleId(null);
      toast.success('Title updated');
    } catch (error) {
      console.error('Failed to update title:', error);
      toast.error('Failed to update title');
    }
  };

  // Start editing title
  const handleStartEditTitle = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitleId(conv.conversationId);
    setEditingTitle(conv.title);
  };

  useEffect(() => {
    // Save cost data to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('costData', JSON.stringify(costData));
    }
  }, [costData]);

  // More accurate token estimation (accounts for different content types)
  const estimateTokens = (text: string): number => {
    // Rough estimation: ~0.75 tokens per word, or ~3-4 chars per token
    // This is more accurate than simple char/4 division
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    // Use word-based estimate (more accurate) with char-based fallback
    const wordBased = words * 1.3; // ~1.3 tokens per word (accounts for punctuation, etc.)
    const charBased = chars / 3.5; // ~3.5 chars per token average
    // Average of both methods for better accuracy
    return Math.max(wordBased, charBased);
  };

  const estimateCost = (tokens: number, costPer1M: number): number => {
    return (tokens / 1_000_000) * costPer1M;
  };

  // Handle image paste/upload and text paste normalization
  const handleImagePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasImage = false;
    
    // Check for images first
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        hasImage = true;
        const file = items[i].getAsFile();
        if (file) {
          await handleImageFile(file);
        }
      }
    }
    
    // If no image, handle text paste with normalization
    if (!hasImage) {
      const pastedText = e.clipboardData.getData('text');
      if (pastedText) {
        // Normalize pasted text to remove em dashes and other problematic characters
        const normalizedText = normalizeOnPaste(pastedText);
        
        // If the text was modified, prevent default and insert normalized text
        if (normalizedText !== pastedText) {
          e.preventDefault();
          const textarea = e.currentTarget as HTMLTextAreaElement;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const currentValue = input;
          const newValue = currentValue.slice(0, start) + normalizedText + currentValue.slice(end);
          setInput(newValue);
          
          // Set cursor position after inserted text
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + normalizedText.length;
          }, 0);
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

  // Handle file attachments (PDFs, images, text files, etc.)
  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // Check file size (20MB max)
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        return;
      }

      // Check if it's an image - handle separately
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setSelectedImages((prev) => [...prev, base64]);
        };
        reader.readAsDataURL(file);
        toast.success(`Image ${file.name} added`);
        return;
      }

      // For other files (PDF, TXT, CSV, etc.)
      const fileObj = {
        file,
        type: file.type,
        name: file.name,
      };

      setAttachedFiles((prev) => [...prev, fileObj]);
      toast.success(`File ${file.name} attached`);
    });

    // Reset input
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string, name?: string) => {
    const fileName = (name || '').toLowerCase();
    if (type === 'application/pdf' || fileName.endsWith('.pdf')) return '📄';
    if (type.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) return '📝';
    if (type.includes('presentation') || fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) return '📊';
    if (type === 'text/csv' || fileName.endsWith('.csv')) return '📈';
    if (type.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return '📊';
    if (type.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) return '📄';
    if (type === 'application/json' || fileName.endsWith('.json')) return '📋';
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('code') || type.includes('javascript') || type.includes('typescript')) return '💻';
    return '📎';
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedImages.length === 0 && attachedFiles.length === 0) || isLoading) return;

    // Check message limit
    if (!canSendMessage()) {
      setShowLimitModal(true);
      toast.error(`Daily message limit reached! Upgrade to continue chatting.`);
      return;
    }

    // Create conversation if needed
    let convId = currentConversationId;
    let isNewConversation = false;
    if (!convId) {
      // Generate title from first message
      const title = generateTitleFromMessage(input);
      convId = await createConversation(title);
      setCurrentConversationId(convId);
      isNewConversation = true;
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
    
    // Increment message count and update remaining
    const updatedUsage = incrementMessageCount();
    setRemainingMessages(getRemainingMessages());
    
    // Check if this was the last message
    if (!canSendMessage()) {
      setShowLimitModal(true);
    }
    
    // Update title if this is the first message
    if (isNewConversation && input.trim()) {
      const title = generateTitleFromMessage(input);
      await updateConversationTitle(convId, title);
      await loadConversations();
    }
    
    setInput('');
    setSelectedImages([]);
    setAttachedFiles([]);
    setIsLoading(true);
    setActiveTools([]);

    try {
      // Compress images before sending to reduce token usage
      // Large images can be 50k+ tokens each, causing rate limit errors
      let compressedImages = selectedImages;
      if (selectedImages.length > 0) {
        try {
          toast.loading('Compressing images to reduce token usage...', { id: 'compressing' });
          compressedImages = await compressImages(selectedImages, {
            maxWidth: 2048,
            maxHeight: 2048,
            quality: 0.85,
            maxSizeKB: 500, // Target 500KB per image
          });
          
          // Log compression results
          const originalTokens = selectedImages.reduce((sum, img) => sum + estimateImageTokens(img), 0);
          const compressedTokens = compressedImages.reduce((sum, img) => sum + estimateImageTokens(img), 0);
          const reduction = ((originalTokens - compressedTokens) / originalTokens * 100).toFixed(1);
          
          console.log(`Image compression: ${originalTokens.toLocaleString()} → ${compressedTokens.toLocaleString()} tokens (${reduction}% reduction)`);
          toast.success(`Images compressed: ${reduction}% token reduction`, { id: 'compressing', duration: 2000 });
        } catch (error) {
          console.error('Image compression error:', error);
          toast.error('Failed to compress images, using originals', { id: 'compressing' });
          // Continue with original images if compression fails
        }
      }

      // Prepare image files for API
      const imageFiles = compressedImages.map((img, idx) => ({
        type: 'image/jpeg', // Compressed images are JPEG
        data: img,
        name: `image-${idx}.jpg`,
      }));

      // Convert attached files to base64
      const filePromises = attachedFiles.map(async (fileObj) => {
        return new Promise<{ type: string; data: string; name: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            resolve({
              type: fileObj.type,
              data: base64,
              name: fileObj.name,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(fileObj.file);
        });
      });

      const convertedFiles = await Promise.all(filePromises);
      const files = [...imageFiles, ...convertedFiles];

      // Fetch personal info on client side (IndexedDB is only available in browser)
      let personalInfoContext = '';
      try {
        const { getRelevantPersonalInfo, getPersonalInfoContext } = await import('@/lib/utils/personal-info');
        const relevantPersonalInfo = await getRelevantPersonalInfo(input, 3);
        if (relevantPersonalInfo.length > 0) {
          // Format relevant personal info
          personalInfoContext = '\n\n[Relevant Personal Information]:\n';
          relevantPersonalInfo.forEach((info, index) => {
            personalInfoContext += `\n${index + 1}. ${info.title} (${info.category})\n`;
            personalInfoContext += `${info.content}\n`;
            if (info.metadata?.technologies) {
              personalInfoContext += `Technologies: ${info.metadata.technologies.join(', ')}\n`;
            }
          });
        } else {
          // If no specific match, include general personal info summary
          personalInfoContext = await getPersonalInfoContext();
        }
      } catch (error) {
        console.error('Personal info retrieval error:', error);
        // Continue without personal info if it fails
      }

      // Fetch persistent memory on client side
      let memoryContext = '';
      try {
        const { searchMemories, formatMemoriesForContext } = await import('@/lib/utils/memory');
        const relevantMemories = await searchMemories(input, 5);
        if (relevantMemories.length > 0) {
          memoryContext = formatMemoriesForContext(relevantMemories);
        }
      } catch (error) {
        console.error('Memory retrieval error:', error);
        // Continue without memory if it fails
      }

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
          deepWebSearch, // Pass deep web search flag
          personalInfoContext, // Include personal info context
          memoryContext, // Include persistent memory context
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
                } else if (parsed.type === 'usage' && parsed.usage) {
                  // Store actual usage data if provided by API
                  assistantMessage.metadata = {
                    ...assistantMessage.metadata,
                    usage: parsed.usage,
                  };
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e, data);
              }
            }
          }
        }

        // Calculate and update cost (use actual usage if available, otherwise estimate)
        if (assistantMessage.metadata?.costPer1M) {
          let totalTokens: number;
          
          // Use actual token usage if available from API
          if (assistantMessage.metadata.usage?.totalTokens) {
            totalTokens = assistantMessage.metadata.usage.totalTokens;
          } else {
            // Fallback to improved estimation
            const inputTokens = estimateTokens(input);
            const outputTokens = estimateTokens(assistantMessage.content);
            
            // Account for system prompts and context (rough estimate: ~500-1000 tokens)
            const contextTokens = 750; // Average system prompt + context overhead
            
            // Account for images if present (each image adds significant tokens)
            const imageTokens = selectedImages.length * 170; // ~170 tokens per image (base64 encoded)
            
            totalTokens = inputTokens + outputTokens + contextTokens + imageTokens;
          }
          
          const cost = estimateCost(totalTokens, assistantMessage.metadata.costPer1M);
          
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

        // Extract and save potential memories from the conversation
        try {
          const { extractPotentialMemories, addMemory } = await import('@/lib/utils/memory');
          const potentialMemories = extractPotentialMemories(input, assistantMessage.content);
          
          // Add memories (with deduplication - check if similar memory exists)
          for (const memory of potentialMemories) {
            try {
              // Simple deduplication: check if similar fact already exists
              const { searchMemories } = await import('@/lib/utils/memory');
              const existing = await searchMemories(memory.fact, 1);
              
              if (existing.length === 0 || existing[0].fact.toLowerCase() !== memory.fact.toLowerCase()) {
                await addMemory(memory, convId || 'unknown');
              }
            } catch (err) {
              console.error('Failed to add memory:', err);
              // Continue with other memories
            }
          }
        } catch (error) {
          console.error('Memory extraction error:', error);
          // Continue - memory extraction is non-critical
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Check if it's a Claude funding error
      if (error.isFundingError || error.message?.toLowerCase().includes('funding') || 
          error.message?.toLowerCase().includes('insufficient quota') ||
          error.message?.toLowerCase().includes('payment required')) {
        setShowFundingError(true);
        toast.error('Claude funding depleted. Please reload your account.', { duration: 6000 });
      } 
      // Check if it's a provider availability error
      else if (error.message?.includes('not configured')) {
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
    if (!userOverride) {
      return 'Kimi K2 (default)';
    }
    const selectedOption = modelOptions.find(opt => opt.value === userOverride);
    return selectedOption ? selectedOption.label : 'Kimi K2 (default)';
  };

  // Get provider color for current model
  const getCurrentModelColor = (): string => {
    if (!userOverride) return 'text-slate-400';
    const provider = userOverride.split('/')[0];
    if (provider === 'groq') return 'text-emerald-400';
    if (provider === 'kimi') return 'text-blue-400';
    if (provider === 'anthropic') return 'text-purple-400';
    if (provider === 'perplexity') return 'text-orange-400';
    if (provider === 'openai') return 'text-emerald-400';
    if (provider === 'gemini') return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <div className="flex h-screen w-screen fixed top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/50 flex flex-col shadow-2xl">
        {/* New Chat Button */}
        <div className="p-4 border-b border-slate-800/50">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 rounded-xl transition-all duration-300 font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Recent Conversations */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              RECENT
            </h2>
            {conversations.length > 0 && (
              <button
                onClick={toggleMultiSelectMode}
                className={`px-2 py-1 text-xs rounded-lg transition-all duration-200 ${
                  multiSelectMode
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
                title={multiSelectMode ? 'Exit multi-select' : 'Select multiple'}
              >
                {multiSelectMode ? 'Cancel' : 'Select'}
              </button>
            )}
          </div>
          {conversations.length > 0 && (
            <div className="mb-3 px-2">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-800/50 text-white rounded-xl border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 placeholder:text-slate-500"
              />
            </div>
          )}
          {multiSelectMode && conversations.length > 0 && (
            <div className="mb-3 px-2 flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
              >
                {(searchQuery ? filteredConversations : conversations.slice(0, 10)).length > 0 &&
                 selectedConversations.size === (searchQuery ? filteredConversations : conversations.slice(0, 10)).length ? (
                  <CheckSquare className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                Select All
              </button>
              {selectedConversations.size > 0 && (
                <span className="text-xs text-slate-400">
                  {selectedConversations.size} selected
                </span>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            {(searchQuery ? filteredConversations : conversations.slice(0, 10)).map((conv) => {
              const isSelected = selectedConversations.has(conv.conversationId);
              return (
              <div
                key={conv.conversationId}
                className={`
                  group px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer
                  ${currentConversationId === conv.conversationId && !multiSelectMode
                    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                    : isSelected
                    ? 'bg-indigo-600/20 border border-indigo-500/50'
                    : 'hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50'
                  }
                `}
              >
                {editingTitleId === conv.conversationId ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => {
                        if (editingTitle.trim()) {
                          handleUpdateTitle(conv.conversationId, editingTitle);
                        } else {
                          setEditingTitleId(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editingTitle.trim()) {
                            handleUpdateTitle(conv.conversationId, editingTitle);
                          }
                        } else if (e.key === 'Escape') {
                          setEditingTitleId(null);
                          setEditingTitle('');
                        }
                      }}
                      autoFocus
                      className="flex-1 px-2 py-1 text-sm bg-slate-800/80 text-white rounded-lg border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      {multiSelectMode && (
                        <button
                          onClick={(e) => handleDeleteConversation(conv.conversationId, e)}
                          className="mt-1 p-1 text-slate-400 hover:text-indigo-400 transition-all duration-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <div 
                        onClick={() => !multiSelectMode && handleLoadConversation(conv.conversationId)}
                        className={`flex-1 ${!multiSelectMode ? 'cursor-pointer' : ''}`}
                      >
                        <div className="text-sm font-medium text-white truncate mb-1">
                          {conv.title}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatConversationTime(conv.updatedAt)}
                        </div>
                      </div>
                    </div>
                    {!multiSelectMode && (
                      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={(e) => handleStartEditTitle(conv, e)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200"
                          title="Edit title"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.conversationId, e)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
            })}
            {conversations.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-4">
                No conversations yet
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800/50 space-y-1.5">
          {multiSelectMode && selectedConversations.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2.5 text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-xl transition-all duration-200 w-full group font-medium"
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              Delete {selectedConversations.size} Conversation{selectedConversations.size > 1 ? 's' : ''}
            </button>
          )}
          <button 
            onClick={() => {
              if (messages.length === 0) {
                toast.error('No conversation to export');
                return;
              }
              const conversationText = messages.map(m => {
                const normalizedContent = normalizeForClipboard(m.content);
                return `${m.role === 'user' ? 'You' : 'Assistant'}: ${normalizedContent}`;
              }).join('\n\n');
              const blob = new Blob([conversationText], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `conversation-${Date.now()}.md`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Conversation exported');
            }}
            className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 px-3 py-2 rounded-xl transition-all duration-200 w-full group"
            disabled={messages.length === 0}
          >
            <Download className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            Export Chat
          </button>
          <button 
            onClick={() => setShowPersonalInfo(true)}
            className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 px-3 py-2 rounded-xl transition-all duration-200 w-full group"
          >
            <User className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            Personal Info
          </button>
          <button 
            onClick={() => setShowResumeCustomizer(true)}
            className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 px-3 py-2 rounded-xl transition-all duration-200 w-full group"
          >
            <FileText className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            Resume Customizer
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 px-3 py-2 rounded-xl transition-all duration-200 w-full group"
          >
            <Settings className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            Settings
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mode Tabs */}
        <div className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/50">
          <div className="flex items-center gap-2 px-6 py-3">
            <button
              onClick={() => {
                setMode('primary');
                localStorage.setItem('chatMode', 'primary');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                mode === 'primary'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Primary
            </button>
            <button
              onClick={() => {
                setMode('coding');
                localStorage.setItem('chatMode', 'coding');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                mode === 'coding'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Code className="w-4 h-4 inline mr-1.5" />
              Coding
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="bg-slate-900/40 backdrop-blur-xl border-b border-slate-800/50 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Shilo Chat
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                {getCurrentModelDisplay()} • ${costData.session.toFixed(2)}/1K tokens
              </span>
              {remainingMessages !== Infinity && (
                <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                  remainingMessages <= 5 
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                    : remainingMessages <= 10
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {remainingMessages} messages left today
                </span>
              )}
            </div>
            {mode === 'coding' && (
              <span className="text-xs px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 font-medium">
                Multi-Agent Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer hover:text-white transition-all duration-200 px-3 py-2 rounded-xl hover:bg-slate-800/50 group">
              <input
                type="checkbox"
                checked={deepWebSearch}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDeepWebSearch(checked);
                  localStorage.setItem('deepWebSearch', String(checked));
                  if (checked) {
                    toast.success('Deep web search enabled - Perplexity will be used for web/research queries', { duration: 3000 });
                  } else {
                    toast.success('Deep web search disabled', { duration: 2000 });
                  }
                }}
                className="w-4 h-4 rounded-lg border-slate-600 bg-slate-800/50 text-orange-500 focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer transition-all duration-200 group-hover:border-orange-400"
                title="Enable deep web search using Perplexity for web scraping and research queries"
              />
              <span className="flex items-center gap-1.5">
                <Globe className={`w-4 h-4 transition-colors duration-200 ${deepWebSearch ? 'text-orange-400' : 'text-slate-400'}`} />
                <span className={deepWebSearch ? 'text-orange-400 font-medium' : ''}>
                  Activate Deep Web Search
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          onScroll={checkIfAtBottom}
          className="flex-1 overflow-y-auto px-6 pt-6 pb-4 space-y-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative"
        >
          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={() => {
                scrollToBottom(true);
                setIsAtBottom(true);
                setShowScrollButton(false);
              }}
              className="fixed bottom-24 right-8 z-50 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 flex items-center gap-2"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          )}
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-4xl mb-4">
                  {mode === 'coding' ? '💻' : '👋'}
                </div>
                <p className="text-xl text-slate-200 mb-2 font-medium">
                  {mode === 'coding' 
                    ? 'Coding Mode Active' 
                    : 'Hey! Welcome to Shilo Chat.'}
                </p>
                <p className="text-slate-400 mb-4">
                  {mode === 'coding'
                    ? 'I\'m your expert coding assistant. I can help with code generation, refactoring, debugging, architecture design, and more. I use multi-agent workflows and follow best practices from top coding tools.'
                    : 'How can I help you today?'}
                </p>
                {mode === 'coding' && (
                  <div className="text-sm text-slate-500 space-y-1 mt-4">
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
              <div className="max-w-2xl relative w-full">
                {editingMessageId === message.id && message.role === 'user' ? (
                  <div className="rounded-2xl px-5 py-4 shadow-lg bg-slate-800/90 backdrop-blur-sm border border-indigo-500/50">
                    <textarea
                      value={editingMessageContent}
                      onChange={(e) => setEditingMessageContent(e.target.value)}
                      className="w-full bg-transparent text-white resize-none focus:outline-none mb-3 min-h-[60px]"
                      rows={Math.min(editingMessageContent.split('\n').length + 1, 10)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingMessageId(null);
                          setEditingMessageContent('');
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          if (!editingMessageContent.trim()) return;
                          
                          const editedContent = editingMessageContent;
                          setEditingMessageId(null);
                          setEditingMessageContent('');
                          
                          // Remove the old assistant response if it exists
                          if (msgIndex < messages.length - 1 && messages[msgIndex + 1].role === 'assistant') {
                            setMessages(prev => prev.slice(0, msgIndex + 1));
                          }
                          
                          // Update the message content
                          setMessages(prev => {
                            const updated = [...prev];
                            updated[msgIndex] = { ...updated[msgIndex], content: editedContent };
                            return updated;
                          });
                          
                          // Set input and trigger send
                          setInput(editedContent);
                          // Use a small delay to ensure state is updated
                          await new Promise(resolve => setTimeout(resolve, 50));
                          
                          // Manually trigger handleSend
                          const event = new Event('click');
                          const sendButton = document.querySelector('[data-send-button]') as HTMLButtonElement;
                          if (sendButton && !sendButton.disabled) {
                            sendButton.click();
                          }
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        Save & Resend
                      </button>
                      <button
                        onClick={() => {
                          setEditingMessageId(null);
                          setEditingMessageContent('');
                        }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                <div
                  className={`rounded-2xl px-5 py-4 shadow-lg transition-all duration-200 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-600 text-white'
                      : 'bg-slate-800/80 backdrop-blur-sm text-slate-100 border border-slate-700/50'
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
                )}
                {/* Message actions */}
                <div className={`flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <button
                    onClick={() => {
                      const normalizedContent = normalizeForClipboard(message.content || '');
                      navigator.clipboard.writeText(normalizedContent);
                      toast.success('Copied to clipboard');
                    }}
                    className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-300 transition-colors"
                    title="Copy message"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {message.role === 'user' && (
                    <button
                      onClick={() => {
                        setEditingMessageId(message.id);
                        setEditingMessageContent(message.content || '');
                      }}
                      className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-indigo-400 transition-colors"
                      title="Edit message"
                      disabled={isLoading || editingMessageId !== null}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {message.role === 'assistant' && (
                    <button
                      onClick={async () => {
                        if (isLoading) return;
                        setIsLoading(true);
                        try {
                          const lastUserMessage = messages.slice(0, msgIndex).reverse().find(m => m.role === 'user');
                          if (!lastUserMessage) return;
                          
                          // Fetch personal info on client side
                          let personalInfoContext = '';
                          try {
                            const { getRelevantPersonalInfo, getPersonalInfoContext } = await import('@/lib/utils/personal-info');
                            const relevantPersonalInfo = await getRelevantPersonalInfo(lastUserMessage.content || '', 3);
                            if (relevantPersonalInfo.length > 0) {
                              personalInfoContext = '\n\n[Relevant Personal Information]:\n';
                              relevantPersonalInfo.forEach((info, index) => {
                                personalInfoContext += `\n${index + 1}. ${info.title} (${info.category})\n`;
                                personalInfoContext += `${info.content}\n`;
                                if (info.metadata?.technologies) {
                                  personalInfoContext += `Technologies: ${info.metadata.technologies.join(', ')}\n`;
                                }
                              });
                            } else {
                              personalInfoContext = await getPersonalInfoContext();
                            }
                          } catch (error) {
                            console.error('Personal info retrieval error:', error);
                          }

                          // Fetch persistent memory
                          let memoryContext = '';
                          try {
                            const { searchMemories, formatMemoriesForContext } = await import('@/lib/utils/memory');
                            const relevantMemories = await searchMemories(lastUserMessage.content || '', 5);
                            if (relevantMemories.length > 0) {
                              memoryContext = formatMemoriesForContext(relevantMemories);
                            }
                          } catch (error) {
                            console.error('Memory retrieval error:', error);
                          }
                          
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
                              deepWebSearch, // Include deep web search flag
                              personalInfoContext, // Include personal info context
                              memoryContext, // Include persistent memory context
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
                      className="p-2 hover:bg-slate-800/50 rounded-xl text-slate-400 hover:text-indigo-400 transition-all duration-200 hover:scale-110"
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
                    className="p-2 hover:bg-slate-800/50 rounded-xl text-slate-400 hover:text-red-400 transition-all duration-200 hover:scale-110"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {message.timestamp && (
                    <span className="text-xs text-slate-500">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl px-5 py-4 border border-slate-700/50 shadow-lg">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              </div>
            </div>
          )}

          {/* Invisible anchor for scrolling - no height */}
          <div ref={messagesEndRef} className="h-0" />
        </div>

        {/* Input Area */}
        <div className="bg-slate-900/60 backdrop-blur-xl border-t border-slate-800/50 p-4 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            {/* Model Selector */}
            <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  Model:
                </label>
                <div className="relative">
                  <select
                    value={userOverride}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const provider = newValue.split('/')[0];
                      
                      // Warn if trying to use non-vision model with images/files
                      // Only Claude and OpenAI support images/file extraction
                      if ((selectedImages.length > 0 || attachedFiles.length > 0) && 
                          (provider === 'groq' || provider === 'perplexity' || provider === 'kimi' || provider === 'gemini')) {
                        toast.error('Only Claude and OpenAI support images/files. Auto-selecting Claude.');
                        // Auto-select Claude (preferred) or OpenAI for vision/file processing
                        const visionModel = modelOptions.find(opt => 
                          opt.value.startsWith('anthropic/')
                        ) || modelOptions.find(opt => 
                          opt.value.startsWith('openai/')
                        );
                        if (visionModel) {
                          setUserOverride(visionModel.value);
                          localStorage.setItem('defaultModel', visionModel.value);
                          toast.success(`Switched to ${visionModel.label} (supports images/files)`);
                          return;
                        } else {
                          toast.error('Claude or OpenAI not available. Please add ANTHROPIC_API_KEY or OPENAI_API_KEY.');
                          return;
                        }
                      }
                      
                      setUserOverride(newValue);
                      localStorage.setItem('defaultModel', newValue);
                      const selectedLabel = modelOptions.find(opt => opt.value === newValue)?.label || 'Auto-select';
                      toast.success(`Switched to ${selectedLabel}`, { duration: 2000 });
                    }}
                    className={`appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-700/50 bg-slate-800/50 hover:bg-slate-800/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 cursor-pointer ${getCurrentModelColor()}`}
                    title={(selectedImages.length > 0 || attachedFiles.length > 0) ? "Select Claude (preferred) or OpenAI for image/file processing - Only these support images" : "Select AI model for this conversation (default: Kimi K2)"}
                  >
                    {modelOptions.map((opt) => {
                      const optProvider = opt.value.split('/')[0];
                      // Only Claude and OpenAI support vision/file extraction
                      const supportsVision = optProvider === 'anthropic' || optProvider === 'openai' || opt.value === '';
                      const isDisabled = (selectedImages.length > 0 || attachedFiles.length > 0) && !supportsVision && opt.value !== '';
                      
                      return (
                        <option 
                          key={opt.value} 
                          value={opt.value} 
                          className="bg-slate-800 text-white"
                          disabled={isDisabled}
                        >
                          {opt.label}{(selectedImages.length > 0 || attachedFiles.length > 0) && !supportsVision && opt.value !== '' ? ' (no vision/files)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
                {(selectedImages.length > 0 || attachedFiles.length > 0) && userOverride && !userOverride.startsWith('anthropic/') && userOverride !== '' && (
                  <span className="text-xs text-orange-400 flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Switch to Claude for images/files
                  </span>
                )}
              </div>
              {selectedImages.length > 0 && (
                <span className="text-xs text-orange-400 flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            {/* Image and file previews */}
            {(selectedImages.length > 0 || attachedFiles.length > 0) && (
              <div className="mb-3 space-y-2">
                {/* Image previews */}
                {selectedImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {selectedImages.map((img, idx) => (
                      <div key={`img-${idx}`} className="relative group">
                        <img
                          src={img}
                          alt={`Preview ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-xl border-2 border-slate-700/50 shadow-lg transition-all duration-200 group-hover:border-indigo-500/50 group-hover:scale-105"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:scale-110"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* File attachments */}
                {attachedFiles.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {attachedFiles.map((fileObj, idx) => (
                      <div
                        key={`file-${idx}`}
                        className="relative group flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-200"
                      >
                        <span className="text-lg">{getFileIcon(fileObj.type, fileObj.name)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white truncate max-w-[150px]">
                            {fileObj.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {(fileObj.file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(idx)}
                          className="w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0 shadow-lg hover:scale-110"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onPaste={handleImagePaste}
                  placeholder="Type your message... (Attach files with 📎 or images with 📷)"
                  className="w-full px-4 py-3.5 bg-slate-800/50 text-white rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-slate-700/50 placeholder:text-slate-500 transition-all duration-200 shadow-lg backdrop-blur-sm"
                  rows={1}
                  disabled={isLoading}
                  style={{ 
                    minHeight: '52px', 
                    maxHeight: '33vh',
                    overflowY: 'auto'
                  }}
                />
              </div>
              {/* Image upload */}
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
                className="w-12 h-12 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 cursor-pointer border border-slate-700/50 hover:border-indigo-500/50 hover:scale-105 shadow-lg"
                title="Upload images"
              >
                <ImageIcon className="w-5 h-5 text-slate-300 hover:text-indigo-400 transition-colors" />
              </label>
              
              {/* File attachment */}
              <input
                type="file"
                accept=".pdf,.txt,.csv,.json,.md,.doc,.docx,.pptx,.ppt,.xlsx,.xls,image/*,text/*"
                onChange={handleFileAttachment}
                className="hidden"
                id="file-upload"
                multiple
              />
              <label
                htmlFor="file-upload"
                className="w-12 h-12 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 cursor-pointer border border-slate-700/50 hover:border-indigo-500/50 hover:scale-105 shadow-lg"
                title="Attach files (PDF, images, text, etc.)"
              >
                <Paperclip className="w-5 h-5 text-slate-300 hover:text-indigo-400 transition-colors" />
              </label>
              
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && selectedImages.length === 0 && attachedFiles.length === 0) || !canSendMessage() || editingMessageId !== null}
                data-send-button
                className="w-12 h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 disabled:hover:scale-100"
                title={!canSendMessage() ? 'Daily limit reached. Upgrade to continue.' : 'Send message'}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Send className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Free to use • No API key required
            </p>
          </div>
        </div>

        {/* Personal Info Modal */}
        {showPersonalInfo && (
          <PersonalInfoManager onClose={() => setShowPersonalInfo(false)} />
        )}

        {/* Resume Customizer Modal */}
        {showResumeCustomizer && (
          <ResumeCustomizer onClose={() => setShowResumeCustomizer(false)} />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Delete Conversation</h2>
              </div>
              
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently removed.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setConversationToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteConversation}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Limit Modal */}
        {showLimitModal && (() => {
          const usage = getUsageData();
          const currentTier = usage.subscriptionTier;
          const currentLimit = getMessageLimit();
          
          // Determine upgrade suggestion based on current tier
          let upgradeTier: 'plus' | 'premium' | null = null;
          let upgradeMessage = '';
          
          if (currentTier === 'free') {
            upgradeTier = 'plus';
            upgradeMessage = 'Upgrade to Plus (100 messages/day) or Premium (500 messages/day) to continue chatting!';
          } else if (currentTier === 'plus') {
            upgradeTier = 'premium';
            upgradeMessage = 'Upgrade to Premium (500 messages/day) to get 5x more messages!';
          } else if (currentTier === 'premium') {
            upgradeMessage = 'You\'ve reached the maximum daily limit. Your messages will reset tomorrow.';
          }
          
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLimitModal(false)}>
              <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Daily Limit Reached</h2>
                  <button
                    onClick={() => setShowLimitModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-gray-300">
                    {upgradeMessage || `You've used all ${currentLimit} messages for today.`}
                  </p>
                  
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <h3 className="text-sm font-medium text-white mb-2">Your Usage</h3>
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Daily Messages: {usage.dailyMessages} / {currentLimit === Infinity ? '∞' : currentLimit}</div>
                      <div>Total Messages: {usage.totalMessages}</div>
                      <div>Current Tier: <span className="text-white capitalize">{currentTier}</span></div>
                    </div>
                  </div>

                  {upgradeTier && (
                    <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-3">
                      <p className="text-sm text-blue-300 mb-2">
                        💡 <strong>Recommended:</strong> {upgradeTier === 'plus' ? 'Plus Plan' : 'Premium Plan'}
                      </p>
                      <p className="text-xs text-blue-400/80">
                        {upgradeTier === 'plus' 
                          ? 'Get 100 messages per day for just $9.99/month'
                          : 'Get 500 messages per day for just $19.99/month'}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    {upgradeTier ? (
                      <>
                        <button
                          onClick={() => {
                            setShowLimitModal(false);
                            window.location.href = `/pricing?highlight=${upgradeTier}`;
                          }}
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                        >
                          Upgrade to {upgradeTier === 'plus' ? 'Plus' : 'Premium'}
                        </button>
                        <button
                          onClick={() => {
                            setShowLimitModal(false);
                            window.location.href = '/pricing';
                          }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                        >
                          View All Plans
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowLimitModal(false)}
                        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Close
                      </button>
                    )}
          </div>
        </div>
      </div>

      {/* Funding Error Modal */}
      <FundingErrorModal 
        isOpen={showFundingError} 
        onClose={() => setShowFundingError(false)} 
      />
    </div>
  );
})()}

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

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Monthly Budget ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyBudget || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : null;
                      setMonthlyBudget(value);
                      if (value !== null) {
                        localStorage.setItem('monthlyBudget', value.toString());
                        setBudgetAlertsShown(new Set()); // Reset alerts when budget changes
                        toast.success('Budget updated');
                      } else {
                        localStorage.removeItem('monthlyBudget');
                      }
                    }}
                    placeholder="No limit"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Set a monthly spending limit. You'll receive alerts at 50%, 75%, 90%, and 100%.
                    {monthlyBudget && costData.monthly > 0 && (
                      <span className="block mt-1 text-yellow-400">
                        Current: ${costData.monthly.toFixed(2)} / ${monthlyBudget.toFixed(2)} ({((costData.monthly / monthlyBudget) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Cost Tracking
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">This Session</span>
                        <span className="text-lg font-semibold text-white">
                          ${costData.session.toFixed(4)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Cost for current conversation session
                      </p>
                    </div>
                    
                    <div className="p-3 bg-blue-600/20 rounded-lg border border-blue-600/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-blue-300 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          This Month
                        </span>
                        <span className="text-lg font-semibold text-blue-200">
                          ${costData.monthly.toFixed(4)}
                        </span>
                      </div>
                      <p className="text-xs text-blue-400/70">
                        Total cost since {new Date(costData.lastReset).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => {
                          if (confirm('Reset monthly cost tracking? This will start a new monthly period.')) {
                            setCostData({
                              session: costData.session,
                              monthly: 0,
                              lastReset: Date.now(),
                            });
                            toast.success('Monthly cost reset');
                          }
                        }}
                        className="flex-1 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                      >
                        Reset Monthly
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Reset session cost? This will clear the current session cost.')) {
                            setCostData({
                              session: 0,
                              monthly: costData.monthly,
                              lastReset: costData.lastReset,
                            });
                            toast.success('Session cost reset');
                          }
                        }}
                        className="flex-1 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                      >
                        Reset Session
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Available Models</h3>
                  <div className="space-y-2 text-xs text-gray-400">
                    <div>• Groq: Llama 3.1 8B, Llama 3.3 70B (Fast & Cheap)</div>
                    <div>• Anthropic: Claude 3.5 Sonnet (Best Quality)</div>
                    <div>• Kimi: Kimi K2 (moonshot-v1-128k) - Vision & Reasoning (Premium)</div>
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
