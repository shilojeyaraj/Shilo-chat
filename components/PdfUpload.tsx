'use client';

import React, { useState, useCallback } from 'react';
import { Upload, File, X, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, Document } from '@/lib/db';
import { processPDF } from '@/lib/utils/pdf';

interface PdfUploadProps {
  onUploadComplete?: (documentId: string) => void;
}

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

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsProcessing(true);
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Process PDF: parse, chunk, and generate embeddings
      const { chunks, embeddings } = await processPDF(file, documentId);

      // Store document metadata
      const document: Document = {
        documentId,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: Date.now(),
        processed: true,
      };
      await db.documents.add(document);

      // Store chunks with embeddings
      await Promise.all(
        chunks.map((chunk, index) =>
          db.chunks.add({
            documentId,
            documentName: file.name,
            chunkIndex: index,
            text: chunk,
            embedding: embeddings[index],
            metadata: {
              timestamp: Date.now(),
            },
          })
        )
      );

      toast.success(`PDF processed successfully! ${chunks.length} chunks created.`);
      await loadUploadedFiles();
      onUploadComplete?.(documentId);
    } catch (error) {
      console.error('PDF processing error:', error);
      toast.error('Failed to process PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
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
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
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
          accept="application/pdf"
          onChange={handleFileInput}
          className="hidden"
          id="pdf-upload"
          disabled={isProcessing}
        />
        <label htmlFor="pdf-upload" className="cursor-pointer">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Processing PDF...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drop PDF here or click to upload
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Max size: 10MB
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
                  <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
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

