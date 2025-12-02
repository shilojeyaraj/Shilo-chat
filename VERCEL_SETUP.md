# Vercel Deployment Setup

## ✅ Fixed Issues

1. **Message Limit Removed** - No more daily message limits for personal use
2. **RAG Error Handling** - RAG now gracefully handles missing OpenAI key (it's optional)
3. **Better Error Messages** - More helpful error messages for missing API keys

## 🔧 Required Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

### **Required (at least one):**
- `GROQ_API_KEY` - Get from https://console.groq.com (FREE tier available)
- `BRAVE_SEARCH_API_KEY` - Get from https://brave.com/search/api/ (FREE 2000/month)

### **Recommended:**
- `KIMI_API_KEY` - Get from https://platform.moonshot.cn (for Kimi K2 - reasoning & vision)
- `PERPLEXITY_API_KEY` - For deep research mode
- `ANTHROPIC_API_KEY` - For Claude 3.5 (best for code editing)

### **Optional:**
- `OPENAI_API_KEY` - Only needed for RAG/embeddings (if you want document search)
- `E2B_API_KEY` - Only needed for code execution ($10/mo)

## 🚨 Current Errors Explained

### Error 1: `/api/personal-info/extract` - "Invalid Authentication"
**Cause:** One of your API keys (GROQ, KIMI, or ANTHROPIC) is invalid or missing in Vercel
**Fix:** 
1. Check your API keys in Vercel environment variables
2. Make sure at least one of GROQ_API_KEY, KIMI_API_KEY, or ANTHROPIC_API_KEY is set
3. Verify the keys are correct (no extra spaces, correct format)

### Error 2: `/api/chat` - "OPENAI_API_KEY is not set"
**Cause:** RAG (document search) requires OpenAI for embeddings
**Fix:** 
- This is now handled gracefully - RAG will just be disabled if OpenAI key is missing
- If you want RAG, add `OPENAI_API_KEY` to Vercel
- If you don't need RAG, you can ignore this warning

## 📝 Steps to Fix

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Add these variables** (copy from your `.env.local`):
   ```
   GROQ_API_KEY=your_groq_key_here
   BRAVE_SEARCH_API_KEY=your_brave_key_here
   KIMI_API_KEY=your_kimi_key_here (optional but recommended)
   PERPLEXITY_API_KEY=your_perplexity_key_here (optional)
   ANTHROPIC_API_KEY=your_anthropic_key_here (optional)
   ```

3. **Redeploy** - Vercel will automatically redeploy when you add environment variables, or you can manually trigger a redeploy

4. **Verify** - Check the logs after redeploy to make sure errors are gone

## 🎯 Minimum Setup (Just to Get It Working)

If you only want basic functionality, you only need:
- `GROQ_API_KEY` - For basic chat
- `BRAVE_SEARCH_API_KEY` - For web search

Everything else is optional and will gracefully degrade if missing.

