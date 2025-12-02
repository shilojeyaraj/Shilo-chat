'use client';

import React, { useState, useCallback } from 'react';
import { Upload, File, X, Loader2, CheckCircle2, FileText, Image as ImageIcon, FileSpreadsheet, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, Document } from '@/lib/db';
import { processFile } from '@/lib/utils/pdf';

interface PdfUploadProps {
  onUploadComplete?: (documentId: string) => void;
}

// Supported file types
const SUPPORTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
];

const SUPPORTED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.doc',
  '.pptx',
  '.ppt',
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.xlsx',
  '.xls',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
];

const getFileIcon = (type: string, name: string) => {
  if (type === 'application/pdf' || name.endsWith('.pdf')) return '📄';
  if (type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return '📝';
  if (type.includes('presentation') || name.endsWith('.pptx') || name.endsWith('.ppt')) return '📊';
  if (type === 'text/csv' || name.endsWith('.csv')) return '📈';
  if (type.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.xls')) return '📊';
  if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) return '📄';
  if (type === 'application/json' || name.endsWith('.json')) return '📋';
  if (type.startsWith('image/')) return '🖼️';
  return '📎';
};

export default function PdfUpload({ onUploadComplete }: PdfUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Document[]>([]);

  // Load uploaded files from database
  React.useEffect(() => {
    loadUploadedFiles();
  }, []);

  const loadUploadedFiles = async () => {
    try {
      const docs = await db.documents.orderBy('uploadedAt').reverse().toArray();
      setUploadedFiles(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const isFileSupported = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    const isValidType = SUPPORTED_TYPES.includes(file.type);
    const isValidExtension = SUPPORTED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    return isValidType || isValidExtension;
  };

  const handleFile = async (file: File) => {
    if (!isFileSupported(file)) {
      toast.error(`Unsupported file type. Supported: PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, JSON, images`);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    setIsProcessing(true);
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Process file: parse, chunk, and generate embeddings (if not image)
      const result = await processFile(file, documentId);

      // Store document metadata
      const document: Document = {
        documentId,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: Date.now(),
        processed: !result.isImage, // Images don't need chunking/embeddings
      };
      await db.documents.add(document);

      // Store chunks with embeddings (skip for images)
      if (!result.isImage && result.chunks.length > 0) {
        await Promise.all(
          result.chunks.map((chunk, index) =>
            db.chunks.add({
              documentId,
              documentName: file.name,
              chunkIndex: index,
              text: chunk,
              embedding: result.embeddings[index],
              metadata: {
                timestamp: Date.now(),
              },
            })
          )
        );
        toast.success(`${file.name} processed successfully! ${result.chunks.length} chunks created.`);
      } else if (result.isImage) {
        toast.success(`Image ${file.name} uploaded successfully!`);
      } else {
        toast.success(`${file.name} uploaded successfully!`);
      }

      await loadUploadedFiles();
      onUploadComplete?.(documentId);
    } catch (error) {
      console.error('File processing error:', error);
      toast.error(`Failed to process ${file.name}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files) {
        Array.from(files).forEach(handleFile);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(handleFile);
    }
    // Reset input
    e.target.value = '';
  };

  const deleteDocument = async (documentId: string) => {
    try {
      await db.chunks.where('documentId').equals(documentId).delete();
      await db.documents.where('documentId').equals(documentId).delete();
      toast.success('Document deleted');
      await loadUploadedFiles();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-blue-400'}
        `}
      >
        <input
          type="file"
          accept={SUPPORTED_TYPES.join(',') + ',' + SUPPORTED_EXTENSIONS.join(',')}
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
          multiple
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Processing file...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drop files here or click to upload
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supported: PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, JSON, Images
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Max size: 20MB per file
              </p>
            </div>
          )}
        </label>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Uploaded Documents ({uploadedFiles.length})
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {uploadedFiles.map((doc) => (
              <div
                key={doc.documentId}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">{getFileIcon(doc.type, doc.name)}</span>
                  <span className="truncate text-gray-700 dark:text-gray-300">{doc.name}</span>
                  {doc.processed && (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <button
                  onClick={() => deleteDocument(doc.documentId)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                  title="Delete document"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

