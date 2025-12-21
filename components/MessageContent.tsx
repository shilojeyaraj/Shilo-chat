'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { normalizeForClipboard } from '@/lib/utils/text-normalization';

interface MessageContentProps {
  content: string;
  isCodingMode?: boolean;
}

function MessageContent({ content, isCodingMode = false }: MessageContentProps) {
  const [copiedCodeBlocks, setCopiedCodeBlocks] = useState<Set<number>>(new Set());
  const [collapsedCodeBlocks, setCollapsedCodeBlocks] = useState<Set<number>>(new Set());
  const codeBlockRef = useRef(0);

  const handleCopyCode = useCallback(async (code: string, index: number) => {
    try {
      const normalizedCode = normalizeForClipboard(code);
      await navigator.clipboard.writeText(normalizedCode);
      setCopiedCodeBlocks((prev) => new Set(prev).add(index));
      setTimeout(() => {
        setCopiedCodeBlocks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      // Failed to copy code - silently fail
    }
  }, []);

  const toggleCodeBlock = useCallback((index: number) => {
    setCollapsedCodeBlocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Reset code block index for each render
  useEffect(() => {
    codeBlockRef.current = 0;
  }, [content]);

  // Memoize markdown components - only recreate when state changes
  const markdownComponents = useMemo(() => ({
          // Code blocks with syntax highlighting
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const currentIndex = codeBlockRef.current++;
            // Access state directly in closure - will be current when called
            const isCollapsed = collapsedCodeBlocks.has(currentIndex);
            const isCopied = copiedCodeBlocks.has(currentIndex);

            // Inline code
            if (inline || !language) {
              return (
                <code
                  className="px-1.5 py-0.5 bg-gray-700 text-blue-300 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Code block
            const lines = codeString.split('\n').length;
            const shouldShowCollapse = lines > 20;

            return (
              <div className="my-4 rounded-lg overflow-hidden border border-gray-700 bg-gray-900 max-w-full">
                {/* Code block header */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">{language || 'code'}</span>
                    {shouldShowCollapse && (
                      <button
                        onClick={() => toggleCodeBlock(currentIndex)}
                        className="text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1"
                      >
                        {isCollapsed ? (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            Expand
                          </>
                        ) : (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            Collapse
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopyCode(codeString, currentIndex)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-300 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                {/* Code content */}
                {!isCollapsed && (
                  <div className="relative overflow-x-auto">
                    <SyntaxHighlighter
                      language={language}
                      style={isCodingMode ? vscDarkPlus : oneDark}
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: '#1a1a1a',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        maxWidth: '100%',
                      }}
                      showLineNumbers={lines > 10}
                      lineNumberStyle={{
                        minWidth: '3em',
                        paddingRight: '1em',
                        color: '#6b7280',
                        userSelect: 'none',
                      }}
                      {...props}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                )}
              </div>
            );
          },
          // Headings
          h1: ({ children }: any) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-white">{children}</h1>
          ),
          h2: ({ children }: any) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-white">{children}</h2>
          ),
          h3: ({ children }: any) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-white">{children}</h3>
          ),
          // Lists
          ul: ({ children }: any) => (
            <ul className="list-disc list-inside my-3 space-y-1 text-gray-300">{children}</ul>
          ),
          ol: ({ children }: any) => (
            <ol className="list-decimal list-inside my-3 space-y-1 text-gray-300">{children}</ol>
          ),
          li: ({ children }: any) => <li className="ml-4">{children}</li>,
          // Paragraphs
          p: ({ children }: any) => <p className="my-2 text-gray-300 leading-relaxed">{children}</p>,
          // Links
          a: ({ href, children }: any) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {children}
            </a>
          ),
          // Blockquotes
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-4 border-gray-600 pl-4 my-4 italic text-gray-400">
              {children}
            </blockquote>
          ),
          // Tables
          table: ({ children }: any) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }: any) => (
            <thead className="bg-gray-800">{children}</thead>
          ),
          tbody: ({ children }: any) => <tbody>{children}</tbody>,
          tr: ({ children }: any) => (
            <tr className="border-b border-gray-700">{children}</tr>
          ),
          th: ({ children }: any) => (
            <th className="px-4 py-2 text-left font-semibold text-gray-300 border border-gray-700">
              {children}
            </th>
          ),
          td: ({ children }: any) => (
            <td className="px-4 py-2 text-gray-300 border border-gray-700">{children}</td>
          ),
          // Horizontal rule
          hr: () => <hr className="my-6 border-gray-700" />,
          // Strong/Bold
          strong: ({ children }: any) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          // Emphasis/Italic
          em: ({ children }: any) => <em className="italic text-gray-300">{children}</em>,
  }), [handleCopyCode, toggleCodeBlock, isCodingMode]); // Note: collapsedCodeBlocks/copiedCodeBlocks accessed via closure

  return (
    <div className="message-content prose prose-invert max-w-none break-words overflow-wrap-anywhere min-w-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(MessageContent);

