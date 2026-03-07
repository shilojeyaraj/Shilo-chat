# Shilo Chat - Personalized AI Assistant

A production-grade AI chatbot built on Next.js with PDF parsing, RAG (Retrieval-Augmented Generation), and advanced personalization features.

---

## Live demo

| Link | Description |
|------|--------------|
| **[Live app](https://shilo-chat.vercel.app)** *(add your deploy URL)* | Try the app in the browser. |
| **Run locally** | See [Getting started](#getting-started) below. |

> **Note:** Replace the link above with your actual deployment URL (e.g. Vercel) when you deploy. Until then, use "Run locally" to try the app.

---

## Screenshots

| Chat with model badges | PDF upload & RAG |
|------------------------|------------------|
| *(Add screenshot: `docs/screenshots/chat.png`)* | *(Add screenshot: `docs/screenshots/upload.png`)* |

> Add 1–2 screenshots of the main interface (e.g. chat view, upload view) to `docs/screenshots/` and link them here.

---

## Demo video

| Link | Description |
|------|--------------|
| **[Watch demo (1–3 min)](https://loom.com/your-demo)** *(replace with your Loom/YouTube link)* | Walkthrough: upload PDF, ask a question, see RAG and model routing in action. |

> Record a short Loom or YouTube walkthrough and paste the link above. This helps recruiters and reviewers see the app without running it.

---

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
- **pdf-parse** - PDF text extraction (server-side)
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

## Testing

The project uses **Jest** with **React Testing Library** for unit tests, component (frontend) tests, and API route integration tests.

| Command | Description |
|---------|-------------|
| `pnpm test` | Run tests in watch mode (Jest). |
| `pnpm test:run` | Run all tests once (for CI). |
| `pnpm test:coverage` | Run tests with coverage report. |

**What’s covered:**

- **Unit tests:** `lib/utils` (chunking, text normalization, search/cosine similarity), `lib/llm/router` (task classification).
- **Component tests:** `ChatInterface` (message input, send), `PdfUpload` (upload area, document list).
- **Integration tests:** `POST /api/embeddings` (validation, error handling), `POST /api/chat` (invalid/missing body, minimal valid request).

---

## CI / DevOps

**GitHub Actions** runs on every push and pull request to `main`/`master`:

1. **Lint** — `pnpm lint`
2. **Tests** — `pnpm test:run` (unit + component + API integration)
3. **Build** — `pnpm build`

Workflow file: [`.github/workflows/ci.yml`](.github/workflows/ci.yml). No secrets are required for lint and tests; add `OPENAI_API_KEY` / `OPEN_ROUTER_API_KEY` in repo secrets if you want the build step to use real env in CI.

---

## Development

### Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Intelligent chat API with routing
│   │   ├── embeddings/route.ts         # Embeddings API
│   │   ├── files/parse/route.ts        # File parsing (PDF, DOCX, etc.)
│   │   ├── providers/route.ts         # Available LLM providers
│   │   ├── personal-info/              # Extract & save personal info
│   │   ├── resume/optimize/            # Resume optimization
│   │   └── cover-letter/optimize/      # Cover letter optimization
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ChatInterface.tsx              # Main chat UI with model badges
│   └── PdfUpload.tsx                  # PDF/file upload component
├── lib/
│   ├── llm/                            # Providers, router, agent-router, types
│   ├── tools/                         # Web search, PDF, CSV, code exec, etc.
│   ├── db/                            # IndexedDB (Dexie)
│   ├── prompts/                       # Agent, study, coding prompts
│   └── utils/                         # Chunking, search, embeddings, pdf, etc.
└── package.json
```

## Next Steps

- [x] Intelligent model routing
- [x] Tool system (web search, PDF, CSV, code execution)
- [x] Cost tracking
- [x] Model badges and tool indicators
- [x] Unit, component, and integration tests (Jest + RTL)
- [x] CI (GitHub Actions: lint, test, build)
- [ ] Add live demo URL and demo video to README
- [ ] Add screenshots to `docs/screenshots/`
- [ ] Add Monaco code editor integration
- [ ] Add file upload for other formats (TXT, JSON, MD, images)
- [ ] Implement personalization features
- [ ] Add keyboard shortcuts
- [ ] Deploy to Vercel

## License

MIT

