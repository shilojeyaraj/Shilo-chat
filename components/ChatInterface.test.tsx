import { render, screen } from '@testing-library/react';
import ChatInterface from './ChatInterface';

jest.mock('@/lib/utils/chat-storage', () => ({
  createConversation: jest.fn().mockResolvedValue('conv-1'),
  saveMessage: jest.fn().mockResolvedValue(undefined),
  loadMessages: jest.fn().mockResolvedValue([]),
  getAllConversations: jest.fn().mockResolvedValue([]),
  deleteConversation: jest.fn().mockResolvedValue(undefined),
  updateConversationTitle: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/utils/text-normalization', () => ({
  normalizeForClipboard: jest.fn((t: string) => t),
  normalizeOnPaste: jest.fn((t: string) => t),
}));

jest.mock('@/lib/utils/image-compression', () => ({
  compressImages: jest.fn().mockResolvedValue([]),
  estimateImageTokens: jest.fn().mockReturnValue(0),
}));

jest.mock('@/lib/db', () => ({
  db: {
    documents: { toArray: jest.fn().mockResolvedValue([]) },
    chunks: { toArray: jest.fn().mockResolvedValue([]) },
  },
  Conversation: {},
}));

jest.mock('@/lib/utils/usage-tracker', () => ({
  incrementMessageCount: jest.fn().mockResolvedValue(undefined),
  getUsageData: jest.fn().mockResolvedValue({ session: 0, monthly: 0, lastReset: 0 }),
}));

jest.mock('react-hot-toast', () => ({
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(() => 'toast-id'),
    dismiss: jest.fn(),
  },
}));

jest.mock('./MessageContent', () => ({ default: () => <div data-testid="message-content" /> }));
jest.mock('./PdfUpload', () => ({ default: () => <div data-testid="pdf-upload" /> }));
jest.mock('./PersonalInfo', () => ({ default: () => <div data-testid="personal-info" /> }));
jest.mock('./ResumeCustomizer', () => ({ default: () => <div data-testid="resume-customizer" /> }));
jest.mock('./FundingErrorModal', () => ({ default: () => null }));

describe('ChatInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders message input with placeholder', async () => {
    render(<ChatInterface />);
    const input = screen.getByPlaceholderText(/Type your message/i);
    expect(input).toBeInTheDocument();
  });

  it('renders send control (button or submit area)', () => {
    render(<ChatInterface />);
    const sendButton = document.querySelector('button[type="submit"]') || screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeInTheDocument();
  });
});
