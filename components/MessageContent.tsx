'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface MessageContentProps {
  content: string;
  isCodingMode?: boolean;
}

export default function MessageContent({ content, isCodingMode = false }: MessageContentProps) {
  const [copiedCodeBlocks, setCopiedCodeBlocks] = useState<Set<number>>(new Set());
  const [collapsedCodeBlocks, setCollapsedCodeBlocks] = useState<Set<number>>(new Set());
  const codeBlockRef = useRef(0);

  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeBlocks((prev) => new Set(prev).add(index));
      setTimeout(() => {
        setCopiedCodeBlocks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const toggleCodeBlock = (index: number) => {
    setCollapsedCodeBlocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Reset code block index for each render
  useEffect(() => {
    codeBlockRef.current = 0;
  }, [content]);

  return (
    <div className="message-content prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks with syntax highlighting
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const currentIndex = codeBlockRef.current++;
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
              <div className="my-4 rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
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
                  <div className="relative">
                    <SyntaxHighlighter
                      language={language}
                      style={isCodingMode ? vscDarkPlus : oneDark}
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: '#1a1a1a',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
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
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-white">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-white">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-white">{children}</h3>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-3 space-y-1 text-gray-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-3 space-y-1 text-gray-300">{children}</ol>
          ),
          li: ({ children }) => <li className="ml-4">{children}</li>,
          // Paragraphs
          p: ({ children }) => <p className="my-2 text-gray-300 leading-relaxed">{children}</p>,
          // Links
          a: ({ href, children }) => (
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
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-600 pl-4 my-4 italic text-gray-400">
              {children}
            </blockquote>
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-800">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-gray-700">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold text-gray-300 border border-gray-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-gray-300 border border-gray-700">{children}</td>
          ),
          // Horizontal rule
          hr: () => <hr className="my-6 border-gray-700" />,
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          // Emphasis/Italic
          em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

