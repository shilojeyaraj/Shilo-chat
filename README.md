# Shilo Chat - Personalized AI Assistant

A production-grade AI chatbot built on Next.js with PDF parsing, RAG (Retrieval-Augmented Generation), and advanced personalization features.

## Features

- ✅ **Intelligent Model Router**: Automatically selects the best model for each task (code, search, reasoning, etc.)
- ✅ **Multi-Provider Support**: Groq, Kimi K2, Anthropic, Perplexity with unified API
- ✅ **PDF Upload & RAG**: Upload PDFs, automatically parse and index them for semantic search
- ✅ **Tool System**: Automatic web search, PDF parsing, CSV analysis, code execution, webpage fetching
- ✅ **Task Classification**: Smart routing based on task type (code generation, web search, reasoning, etc.)
- ✅ **Cost Tracking**: Real-time session and monthly cost tracking
- ✅ **Model Badges**: See which model is handling your request
- ✅ **Tool Indicators**: Visual feedback when tools are being used
- ✅ **Semantic Search**: Find relevant document chunks using embeddings
- ✅ **Privacy-First**: All data stored locally in IndexedDB
- 🔜 Monaco Code Editor (coming soon)
- 🔜 Advanced Personalization (coming soon)

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Shilo-chat
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:
- `GROQ_API_KEY` - **Required** - Get from https://console.groq.com (FREE tier available)
- `BRAVE_SEARCH_API_KEY` - **Required** - Get from https://brave.com/search/api/ (FREE 2000/month)
- `KIMI_API_KEY` - **Recommended** - Get from https://platform.moonshot.cn (for Kimi K2 - reasoning & vision)
- `PERPLEXITY_API_KEY` - Optional, for better search integration
- `ANTHROPIC_API_KEY` - Optional, for Claude 3.5 (best for code editing)
- `OPENAI_API_KEY` - Optional, for embeddings only (Kimi doesn't have embeddings API)
- `E2B_API_KEY` - Optional, for code execution ($10/mo)

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Uploading PDFs

1. Click on the sidebar or drag and drop a PDF file
2. The PDF will be automatically parsed, chunked, and indexed
3. When you chat, relevant chunks will be automatically retrieved and included in the context

### Chatting

- Type your message and press Enter or click Send
- Use Cmd/Ctrl + Enter to send quickly
- Toggle "Use RAG" to enable/disable document context
- Select "Auto-select" for intelligent routing (recommended) or manually choose a model
- Watch the model badge to see which AI is handling your request
- Check cost tracker for session and monthly spending

### Intelligent Routing

The AI automatically selects the best model based on your task:

- **Web Search** → Perplexity (with web search)
- **Code Generation** → Groq Llama 70B (fast & cheap)
- **Code Editing** → Claude 3.5 (best quality)
- **Quick Q&A** → Groq Llama 8B (fastest)
- **Reasoning** → Kimi K2 (excellent reasoning, better pricing)
- **Creative Writing** → Claude 3.5 (best creativity)
- **Data Analysis** → Kimi K2 (excellent analysis)
- **Long Context** → Claude 3.5 (best context handling)
- **Vision** → Kimi K2 (excellent vision capabilities)
- **General** → Groq Llama 70B (balanced)

### Tools

The AI automatically uses tools when needed:

- **Web Search**: When you ask about current events, news, or real-time data
- **PDF Parsing**: When you upload PDF files
- **CSV Analysis**: When you upload CSV files
- **Code Execution**: When you ask to run Python code
- **Webpage Fetching**: When you provide URLs

## Architecture

### RAG Pipeline

1. **PDF Upload**: User uploads PDF via drag-and-drop
2. **Parsing**: PDF text is extracted using `pdf-parse`
3. **Chunking**: Text is split into overlapping chunks (500 tokens, 100 token overlap)
4. **Embedding**: Chunks are converted to embeddings using OpenAI or client-side transformers
5. **Storage**: Embeddings stored in IndexedDB using Dexie.js
6. **Retrieval**: Semantic search finds relevant chunks using cosine similarity
7. **Context**: Relevant chunks are added to LLM context

### Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Dexie.js** - IndexedDB wrapper
- **pdf-parse** - PDF text extraction
- **@xenova/transformers** - Client-side embeddings (fallback)
- **react-hot-toast** - Notifications
- **lucide-react** - Icons
- **openai** - OpenAI SDK
- **@anthropic-ai/sdk** - Anthropic SDK
- **groq-sdk** - Groq SDK
- **cheerio** - Web scraping
- **papaparse** - CSV parsing

## Cost Optimization

The intelligent router automatically selects the cheapest model for each task:

- **Groq**: FREE tier, then $0.27/1M tokens (cheapest for LLM)
- **Kimi K2**: ~$1.2/1M tokens (excellent quality, great pricing)
- **Perplexity**: $5/1M tokens (for web search)
- **Anthropic Claude**: $3/1M tokens (best quality)
- **OpenAI Embeddings**: $0.13/1M tokens (optional, can use client-side)
- **Brave Search**: FREE 2,000 searches/month
- **E2B Code Execution**: $10/mo (optional)

**Estimated Monthly Cost**: $5-10 for personal use (much cheaper than ChatGPT Plus!)

The router ensures you only pay for premium models when needed (e.g., Kimi K2 for complex reasoning and vision, Claude for code editing), while using cheaper models for simple tasks.

## Development

### Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Intelligent chat API with routing
│   │   ├── llm/route.ts           # Legacy LLM API (for compatibility)
│   │   ├── embeddings/route.ts    # Embeddings API
│   │   └── pdf/parse/route.ts     # PDF parsing API
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   └── globals.css                # Global styles
├── components/
│   ├── ChatInterface.tsx          # Main chat UI with model badges
│   └── PdfUpload.tsx              # PDF upload component
├── lib/
│   ├── llm/
│   │   ├── providers.ts           # Multi-provider LLM wrapper
│   │   ├── router.ts              # Task classification & routing
│   │   └── types.ts               # Type definitions
│   ├── tools/
│   │   └── index.ts               # Tool system (web search, PDF, CSV, etc.)
│   ├── db/
│   │   └── index.ts               # IndexedDB setup
│   └── utils/
│       ├── chunking.ts            # Text chunking utilities
│       ├── embeddings.ts          # Embedding generation
│       ├── pdf.ts                 # PDF processing
│       └── search.ts              # Semantic search
└── package.json
```

## Next Steps

- [x] Intelligent model routing
- [x] Tool system (web search, PDF, CSV, code execution)
- [x] Cost tracking
- [x] Model badges and tool indicators
- [ ] Add Monaco code editor integration
- [ ] Add file upload for other formats (TXT, JSON, MD, images)
- [ ] Implement personalization features
- [ ] Add keyboard shortcuts
- [ ] Deploy to Vercel

## License

MIT

