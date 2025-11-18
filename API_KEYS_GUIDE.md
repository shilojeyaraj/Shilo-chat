# API Keys Guide

## 🔴 REQUIRED (Minimum to run the app)

### 1. `GROQ_API_KEY` ⭐ **MOST IMPORTANT**
- **Why**: Primary LLM provider (fastest, cheapest)
- **Get it**: https://console.groq.com
- **Cost**: FREE tier, then $0.27/1M tokens
- **Steps**:
  1. Sign up at console.groq.com
  2. Go to "API Keys"
  3. Click "Create API Key"
  4. Copy the key

**Without this**: The app won't work at all - this is the default model for most tasks.

---

### 2. `BRAVE_SEARCH_API_KEY` ⭐ **REQUIRED FOR WEB SEARCH**
- **Why**: Enables web search tool (automatic when you ask about current events)
- **Get it**: https://brave.com/search/api/
- **Cost**: FREE 2,000 searches/month
- **Steps**:
  1. Sign up at brave.com/search/api/
  2. Create a developer account
  3. Get your API key from dashboard
  4. Copy the key

**Without this**: Web search won't work, but chat will still function.

---

## 🟡 RECOMMENDED (Better experience)

### 3. `OPENAI_API_KEY` 
- **Why**: 
  - Better embeddings for RAG (PDF search quality)
  - Access to GPT-4 for complex reasoning tasks
  - GPT-4 Vision for image analysis
- **Get it**: https://platform.openai.com
- **Cost**: Pay-as-you-go
  - Embeddings: $0.13/1M tokens
  - GPT-4 Turbo: $10/1M tokens
- **Steps**:
  1. Sign up at platform.openai.com
  2. Add payment method
  3. Go to "API Keys"
  4. Create new secret key

**Without this**: 
- RAG will use free client-side embeddings (slower, lower quality)
- GPT-4 routing won't work (falls back to Groq)

---

### 4. `ANTHROPIC_API_KEY`
- **Why**: Best model for code editing and creative writing
- **Get it**: https://console.anthropic.com
- **Cost**: $3/1M tokens (Claude 3.5 Sonnet)
- **Steps**:
  1. Sign up at console.anthropic.com
  2. Add payment method
  3. Go to "API Keys"
  4. Create new key

**Without this**: Code editing tasks will use Groq instead (still works, but lower quality)

---

## 🟢 OPTIONAL (Advanced features)

### 5. `PERPLEXITY_API_KEY`
- **Why**: Better web search integration (more comprehensive results)
- **Get it**: https://www.perplexity.ai/settings/api
- **Cost**: $5/1M tokens
- **Note**: Brave Search is free and works well, this is just an upgrade

**Without this**: Uses Brave Search (which is free and sufficient)

---

### 6. `E2B_API_KEY`
- **Why**: Code execution in Python sandbox
- **Get it**: https://e2b.dev
- **Cost**: $10/month
- **Steps**:
  1. Sign up at e2b.dev
  2. Get API key from dashboard

**Without this**: Code execution tool won't work (but code generation still works)

---

## 📝 Your `.env.local` File

Create a file named `.env.local` in the root directory:

```bash
# ============================================
# REQUIRED - Minimum to run
# ============================================

# Groq API Key (PRIMARY LLM - REQUIRED)
GROQ_API_KEY=sk-groq-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Brave Search API Key (REQUIRED FOR WEB SEARCH)
BRAVE_SEARCH_API_KEY=BSA_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# RECOMMENDED - Better experience
# ============================================

# OpenAI API Key (for embeddings + GPT-4)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Anthropic API Key (for Claude 3.5)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# OPTIONAL - Advanced features
# ============================================

# Perplexity API Key (better web search)
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# E2B API Key (code execution)
E2B_API_KEY=e2b_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# APP CONFIGURATION
# ============================================

# App URL (for deployment)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Client-side OpenAI key (optional, same as OPENAI_API_KEY)
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🎯 Quick Start (Minimum Setup)

If you just want to get started quickly, you only need:

```bash
GROQ_API_KEY=your_groq_key_here
BRAVE_SEARCH_API_KEY=your_brave_key_here
```

This gives you:
- ✅ Full chat functionality
- ✅ Intelligent routing (uses Groq for most tasks)
- ✅ Web search
- ✅ PDF upload and RAG (with free embeddings)
- ❌ No GPT-4 (uses Groq instead)
- ❌ No Claude 3.5 (uses Groq instead)
- ❌ Lower quality embeddings (but still works)

---

## 💰 Cost Breakdown

**Minimum Setup (Groq + Brave):**
- Groq: FREE tier (generous limits)
- Brave: FREE 2,000 searches/month
- **Total: $0/month**

**Recommended Setup (+ OpenAI + Anthropic):**
- Groq: FREE tier
- Brave: FREE
- OpenAI: ~$1-2/month (embeddings)
- Anthropic: ~$2-3/month (occasional use)
- **Total: ~$3-5/month**

**Full Setup (All features):**
- Everything above
- Perplexity: ~$1/month (optional)
- E2B: $10/month (if you need code execution)
- **Total: ~$15/month** (still cheaper than ChatGPT Plus!)

---

## 🔒 Security Notes

1. **Never commit `.env.local` to git** (it's already in `.gitignore`)
2. **Don't share your API keys** publicly
3. **Rotate keys** if you suspect they're compromised
4. **Set usage limits** in provider dashboards to prevent unexpected charges

---

## ✅ Verification

After adding keys, test them:

1. **Groq**: Ask any question - should get a response
2. **Brave Search**: Ask "What's the latest news?" - should search web
3. **OpenAI**: Upload a PDF and ask about it - should use better embeddings
4. **Anthropic**: Ask to edit code - should use Claude
5. **Perplexity**: Ask about current events - should use Perplexity

Check the model badge in the UI to see which provider is being used!

