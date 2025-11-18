# 🚀 Quick Start Guide

## ✅ Step 1: Dependencies Installed

Dependencies are already installed! ✅

## 🔑 Step 2: Add Your API Keys

1. Open `.env.local` file in the root directory
2. Replace the placeholder values with your actual API keys:

```bash
GROQ_API_KEY=sk-groq-actual-key-here
BRAVE_SEARCH_API_KEY=BSA_actual-key-here
OPENAI_API_KEY=sk-proj-actual-key-here
ANTHROPIC_API_KEY=sk-ant-actual-key-here
PERPLEXITY_API_KEY=pplx-actual-key-here
```

**Minimum required:** At least `GROQ_API_KEY` and `BRAVE_SEARCH_API_KEY`

## 🏃 Step 3: Start the App

```bash
pnpm dev
```

Wait for: `Ready - started server on 0.0.0.0:3000`

## 🌐 Step 4: Open in Browser

Open: **http://localhost:3000**

## 🧪 Step 5: Test It!

### Quick Tests:

1. **Basic Chat:**
   - Type: "Hello, what is React?"
   - Should get a response
   - Check model badge (should show Groq)

2. **PDF Upload:**
   - Drag a PDF into the sidebar
   - Wait for "PDF processed successfully" message
   - Ask a question about the PDF content

3. **Web Search:**
   - Ask: "What's the latest news about AI?"
   - Should see web search indicator
   - Response should include current information

4. **Conversation History:**
   - Send a few messages
   - Refresh the page
   - Messages should still be there!

## ✅ Verification Checklist

- [ ] App starts without errors
- [ ] Can send messages and get responses
- [ ] Model badges appear
- [ ] Cost tracker shows costs
- [ ] PDF upload works
- [ ] Conversations persist after refresh
- [ ] No console errors (F12 → Console)

## 🆘 Troubleshooting

### "API key not found" error
- Check `.env.local` exists
- Verify keys are correct (no extra spaces)
- Restart dev server: `Ctrl+C` then `pnpm dev`

### "Module not found" error
```bash
rm -rf node_modules
pnpm install
```

### Port 3000 in use
```bash
# Use different port
pnpm dev -- -p 3001
```

### Browser errors
- Clear browser cache
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## 📚 Full Documentation

- **Setup & Testing**: See `SETUP_AND_TESTING.md`
- **API Keys Guide**: See `API_KEYS_GUIDE.md`
- **Cost Optimization**: See `COST_OPTIMIZATION_EXPLAINED.md`

## 🎉 You're Ready!

Once you see the chat interface and can send messages, everything is working!

Enjoy your AI assistant! 🚀
