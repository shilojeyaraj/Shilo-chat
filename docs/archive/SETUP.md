# Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add at least one API key:
   - `GROQ_API_KEY` (required for chat) - Get from https://console.groq.com
   - `OPENAI_API_KEY` (optional, for better embeddings) - Get from https://platform.openai.com

3. **Run the development server:**
   ```bash
   pnpm dev
   ```

4. **Open your browser:**
   Navigate to http://localhost:3000

## Getting API Keys

### Groq API Key (Required)
1. Go to https://console.groq.com
2. Sign up for a free account
3. Navigate to API Keys
4. Create a new API key
5. Copy and paste into `.env.local` as `GROQ_API_KEY`

**Why Groq?** It's the fastest and cheapest option ($0.27/1M tokens, with free tier)

### OpenAI API Key (Optional but Recommended)
1. Go to https://platform.openai.com
2. Sign up and add payment method
3. Navigate to API Keys
4. Create a new secret key
5. Copy and paste into `.env.local` as `OPENAI_API_KEY`

**Why OpenAI?** Better quality embeddings for RAG. If not provided, the app will use free client-side embeddings.

### Brave Search API Key (Optional)
1. Go to https://brave.com/search/api/
2. Sign up for developer account
3. Get your API key
4. Copy and paste into `.env.local` as `BRAVE_SEARCH_API_KEY`

**Why Brave?** Free 2,000 searches/month for web search feature (coming soon)

## Testing the Setup

1. **Test PDF Upload:**
   - Upload a PDF file in the sidebar
   - Wait for processing to complete
   - You should see a success message with chunk count

2. **Test Chat:**
   - Type a message related to your uploaded PDF
   - Toggle "Use RAG" to see the difference
   - Check that sources appear in the response

3. **Test Different Models:**
   - Try switching between Groq, OpenAI, and OpenRouter
   - Each requires its respective API key

## Troubleshooting

### "API key not found" error
- Make sure your `.env.local` file exists
- Check that the API key name matches exactly (e.g., `GROQ_API_KEY`)
- Restart the dev server after adding environment variables

### PDF upload fails
- Check file size (must be < 10MB)
- Ensure file is a valid PDF
- Check browser console for errors

### Embeddings fail
- If OpenAI API key is not set, it will fall back to client-side embeddings
- Client-side embeddings require downloading the model (first time only, ~90MB)
- Be patient on first use

### Chat doesn't respond
- Check that at least one LLM API key is configured
- Verify the API key is valid
- Check browser console and server logs for errors

## Next Steps

After setup is complete:
1. Upload some PDFs to test RAG
2. Try asking questions about the uploaded documents
3. Experiment with different models
4. Check out the README for feature roadmap

