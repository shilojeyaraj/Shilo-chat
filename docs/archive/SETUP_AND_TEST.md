# Complete Setup & Testing Guide

## 🚀 Step-by-Step Setup

### Step 1: Install Dependencies

```bash
# Install all packages
pnpm install
```

**What this installs:**
- Next.js, React, TypeScript
- All LLM providers (OpenAI, Anthropic, Groq SDKs)
- Database (Dexie for IndexedDB)
- PDF parsing, CSV parsing, web scraping
- UI components and utilities

**Expected output:** Should complete without errors. Takes 1-2 minutes.

---

### Step 2: Set Up Environment Variables

Create `.env.local` file in the root directory:

```bash
# Copy the example (if it exists) or create new
# Windows PowerShell:
Copy-Item .env.example .env.local
# Or just create the file manually
```

**Required keys (minimum):**
```bash
GROQ_API_KEY=your_groq_key_here
BRAVE_SEARCH_API_KEY=your_brave_key_here
```

**Recommended keys:**
```bash
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
PERPLEXITY_API_KEY=your_perplexity_key_here
```

**App config:**
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Get your keys:**
- Groq: https://console.groq.com
- Brave: https://brave.com/search/api/
- OpenAI: https://platform.openai.com
- Anthropic: https://console.anthropic.com
- Perplexity: https://www.perplexity.ai/settings/api

---

### Step 3: Start Development Server

```bash
pnpm dev
```

**Expected output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in X seconds
```

**If you see errors:**
- Check that all dependencies installed: `pnpm install`
- Check Node.js version: `node --version` (need 18+)
- Check pnpm is installed: `pnpm --version`

---

## ✅ Testing Checklist

### Test 1: Basic Chat Functionality

1. **Open browser:** http://localhost:3000
2. **Send a message:** "Hello, what can you do?"
3. **Expected:** 
   - ✅ Message appears in chat
   - ✅ AI responds
   - ✅ Model badge shows which provider was used
   - ✅ Response streams in real-time

**If it fails:**
- Check browser console for errors (F12)
- Verify GROQ_API_KEY is set in `.env.local`
- Check terminal for API errors

---

### Test 2: Intelligent Routing

1. **Quick Q&A:** Ask "What is React?"
   - Expected: Uses Groq (cheapest, fastest)
   - Check model badge: Should show "Groq" or "Llama"

2. **Code Generation:** Ask "Write a Python function to calculate factorial"
   - Expected: Uses Groq Llama 70B
   - Check model badge: Should show "Groq"

3. **Code Editing:** Ask "Fix this code: [paste some broken code]"
   - Expected: Uses Claude 3.5 (if Anthropic key set)
   - Check model badge: Should show "Anthropic" or "Claude"

4. **Web Search:** Ask "What's the latest news about AI?"
   - Expected: Uses Perplexity (if key set) or falls back
   - Check tool indicator: Should show "Searching web"

**If routing fails:**
- Check that multiple API keys are set
- Check model badges to see which provider is used
- System will fallback to available providers automatically

---

### Test 3: PDF Upload & RAG

1. **Upload a PDF:**
   - Drag & drop a PDF in the sidebar
   - Wait for "PDF processed successfully" message

2. **Ask about PDF:**
   - Ask a question related to the PDF content
   - Enable "Use RAG" toggle
   - Expected: Response includes relevant content from PDF
   - Check sources: Should show PDF name in sources

**If RAG fails:**
- Check browser console for errors
- Verify PDF was processed (check sidebar)
- Make sure "Use RAG" is enabled
- Check if OPENAI_API_KEY is set (for better embeddings)

---

### Test 4: Conversation History

1. **Start chatting:**
   - Send a few messages
   - Refresh the page (F5)
   - Expected: Messages are still there!

2. **Create new conversation:**
   - Click "+" button in sidebar
   - Send a message
   - Expected: New conversation appears in list

3. **Load old conversation:**
   - Click on a conversation in sidebar
   - Expected: Messages load from that conversation

4. **Delete conversation:**
   - Click X button on a conversation
   - Confirm deletion
   - Expected: Conversation removed

**If history fails:**
- Check browser console for IndexedDB errors
- Check if browser allows IndexedDB (most do)
- Try in incognito mode to test fresh

---

### Test 5: Cost Tracking

1. **Send messages:**
   - Send several messages
   - Check header: Should show session cost
   - Expected: Cost increases with each message

2. **Check monthly:**
   - Look at "Month: $X.XX" in header
   - Expected: Accumulates across sessions

**If cost tracking fails:**
- Check localStorage in browser (F12 → Application → Local Storage)
- Should see "costData" key
- Cost is estimated, not exact

---

### Test 6: Tool System

1. **Web Search:**
   - Ask "What's the weather today?"
   - Expected: Tool indicator shows "Searching web"
   - Response includes current information

2. **PDF Parsing:**
   - Upload PDF, then ask about it
   - Expected: PDF content is used in response

**If tools fail:**
- Check BRAVE_SEARCH_API_KEY is set (for web search)
- Check browser console for tool errors
- Tools gracefully fail if keys missing

---

## 🔧 Troubleshooting

### "Module not found" errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### "API key not found" errors

1. Check `.env.local` exists in root directory
2. Verify keys are correct (no extra spaces)
3. Restart dev server after adding keys
4. Check key names match exactly (e.g., `GROQ_API_KEY` not `GROQ_KEY`)

### "Port 3000 already in use"

```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port:
pnpm dev -- -p 3001
```

### IndexedDB errors

- Check browser supports IndexedDB (all modern browsers do)
- Try clearing browser data and retry
- Check browser console for specific errors

### Build errors

```bash
# Clear Next.js cache
rm -rf .next
pnpm dev
```

---

## 📋 Quick Verification Commands

```bash
# Check Node.js version (need 18+)
node --version

# Check pnpm is installed
pnpm --version

# Check dependencies installed
pnpm list --depth=0

# Check environment variables (Windows PowerShell)
Get-Content .env.local

# Check if port 3000 is available
netstat -ano | findstr :3000
```

---

## 🎯 Expected Behavior Summary

### ✅ Everything Working:
- Chat responds to messages
- Model badges show correct provider
- Conversations save and load
- PDF upload works
- Cost tracking updates
- Tools execute when needed
- No console errors

### ⚠️ Partial Functionality:
- Some features work, others don't → Check API keys
- Routing uses fallbacks → Normal if some keys missing
- RAG uses client-side embeddings → Normal if OpenAI key missing

### ❌ Not Working:
- Nothing responds → Check GROQ_API_KEY
- Can't upload PDFs → Check browser console
- History doesn't save → Check IndexedDB support

---

## 🚀 Production Build Test

Once everything works in dev, test production build:

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

**Expected:** Same functionality, but optimized and faster.

---

## 📝 Next Steps After Testing

1. ✅ All tests pass → Ready to use!
2. ⚠️ Some issues → Check troubleshooting section
3. ❌ Major issues → Check console errors and API keys

**You're ready when:**
- Chat responds
- Conversations save
- PDF upload works
- Cost tracking shows
- No major errors in console

---

## 🆘 Still Having Issues?

1. **Check browser console** (F12) for errors
2. **Check terminal** for server errors
3. **Verify API keys** are correct
4. **Check Node.js version** (18+)
5. **Try fresh install:**
   ```bash
   rm -rf node_modules .next pnpm-lock.yaml
   pnpm install
   pnpm dev
   ```

