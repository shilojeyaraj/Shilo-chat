import { render, screen } from '@testing-library/react';
import PdfUpload from './PdfUpload';

jest.mock('@/lib/db', () => ({
  db: {
    documents: {
      orderBy: jest.fn(() => ({
        reverse: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue([]),
        })),
      })),
      add: jest.fn().mockResolvedValue(undefined),
    },
    chunks: {
      add: jest.fn().mockResolvedValue(undefined),
      where: jest.fn(() => ({
        equals: jest.fn(() => ({
          delete: jest.fn().mockResolvedValue(undefined),
        })),
      })),
    },
  },
}));

jest.mock('@/lib/utils/pdf', () => ({
  processFile: jest.fn().mockResolvedValue({ id: 'doc-1', name: 'test.pdf', chunks: [], embeddings: [], isImage: false }),
}));

jest.mock('react-hot-toast', () => ({
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PdfUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload area with drop/click prompt', () => {
    render(<PdfUpload />);
    expect(screen.getByText(/Drop files here or click to upload/i)).toBeInTheDocument();
  });

  it('shows supported file types', () => {
    render(<PdfUpload />);
    expect(screen.getByText(/Supported:.*PDF/i)).toBeInTheDocument();
  });
});
