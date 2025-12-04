# Complete Setup & Testing Guide

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
# Install all packages
pnpm install
```

If you don't have pnpm installed:
```bash
npm install -g pnpm
```

### Step 2: Set Up Environment Variables

Create `.env.local` file in the root directory:

```bash
# Copy the example (if it exists) or create new
cp .env.example .env.local
# OR create manually
```

Edit `.env.local` and add your API keys:

```bash
# REQUIRED
GROQ_API_KEY=sk-groq-your-key-here
BRAVE_SEARCH_API_KEY=BSA_your-key-here

# RECOMMENDED
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
PERPLEXITY_API_KEY=pplx-your-key-here

# APP CONFIG
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Run Development Server

```bash
pnpm dev
```

The app will start at: **http://localhost:3000**

---

## ✅ Installation Verification

### Check if Dependencies are Installed

```bash
# Check if node_modules exists
Test-Path node_modules

# List installed packages
pnpm list --depth=0

# Check for missing dependencies
pnpm install --check
```

### Verify Environment Variables

```bash
# Check if .env.local exists
Test-Path .env.local

# View environment variables (be careful - don't commit this!)
Get-Content .env.local
```

---

## 🧪 Testing Checklist

### 1. Basic Functionality Tests

#### ✅ Test 1: App Starts
- [ ] Run `pnpm dev`
- [ ] Open http://localhost:3000
- [ ] Page loads without errors
- [ ] No console errors in browser

#### ✅ Test 2: Provider Detection
- [ ] Check browser console for "Available providers"
- [ ] Model dropdown shows only configured providers
- [ ] Auto-select option is available

#### ✅ Test 3: Basic Chat
- [ ] Type a message: "Hello, what is React?"
- [ ] Message sends successfully
- [ ] Response appears (streaming)
- [ ] Model badge shows which provider was used
- [ ] Cost tracker updates

### 2. Feature Tests

#### ✅ Test 4: PDF Upload & RAG
- [ ] Upload a PDF file (drag & drop or click)
- [ ] PDF processes successfully (see toast notification)
- [ ] PDF appears in uploaded documents list
- [ ] Ask a question about the PDF content
- [ ] Response includes relevant context from PDF
- [ ] Sources appear in response

#### ✅ Test 5: Web Search
- [ ] Ask: "What's the latest news about AI?"
- [ ] Web search tool activates (see indicator)
- [ ] Response includes current information
- [ ] Sources are cited

#### ✅ Test 6: Code Generation
- [ ] Ask: "Write a Python function to calculate factorial"
- [ ] Code is generated
- [ ] Model badge shows appropriate provider (Groq for code generation)

#### ✅ Test 7: Code Editing
- [ ] Ask: "Fix this code: [paste broken code]"
- [ ] Model badge shows Claude 3.5 (if Anthropic key available)
- [ ] Code is improved/fixed

#### ✅ Test 8: Intelligent Routing
- [ ] Quick question → Should use Groq 8B
- [ ] Code generation → Should use Groq 70B
- [ ] Code editing → Should use Claude 3.5
- [ ] Web search → Should use Perplexity
- [ ] Complex reasoning → Should use GPT-4

### 3. Storage Tests

#### ✅ Test 9: Chat History
- [ ] Send a few messages
- [ ] Refresh the page
- [ ] Messages are still there
- [ ] Conversation appears in sidebar
- [ ] Can click to load conversation

#### ✅ Test 10: Multiple Conversations
- [ ] Click "New conversation" button
- [ ] Start a new chat
- [ ] Both conversations appear in sidebar
- [ ] Can switch between conversations
- [ ] Each conversation loads correctly

#### ✅ Test 11: Delete Conversation
- [ ] Delete a conversation
- [ ] It disappears from sidebar
- [ ] Messages are removed

### 4. Error Handling Tests

#### ✅ Test 12: Missing API Key
- [ ] Temporarily remove a key from .env.local
- [ ] System falls back to available provider
- [ ] Helpful error message shown (if no providers available)

#### ✅ Test 13: Invalid API Key
- [ ] Use invalid key
- [ ] Error message appears
- [ ] App doesn't crash

---

## 🔍 Debugging

### Common Issues

#### Issue: "Module not found"
```bash
# Solution: Reinstall dependencies
rm -rf node_modules
pnpm install
```

#### Issue: "API key not found"
- Check `.env.local` exists
- Verify key names match exactly (case-sensitive)
- Restart dev server after adding keys

#### Issue: "Port 3000 already in use"
```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port:
pnpm dev -- -p 3001
```

#### Issue: "IndexedDB errors"
- Clear browser cache
- Open DevTools → Application → Storage → Clear site data
- Refresh page

### Check Logs

```bash
# Server logs (terminal)
# Look for errors in the terminal where you ran `pnpm dev`

# Browser console
# Press F12 → Console tab
# Look for red errors
```

---

## 📊 Verification Commands

### Check Installation
```bash
# Verify Node.js version (need 18+)
node --version

# Verify pnpm is installed
pnpm --version

# Check all dependencies installed
pnpm list --depth=0 | Select-String "UNMET"
```

### Check Environment
```bash
# Verify .env.local exists
Test-Path .env.local

# Count API keys (should have at least GROQ_API_KEY)
(Get-Content .env.local | Select-String "API_KEY").Count
```

### Check Build
```bash
# Test production build
pnpm build

# If build succeeds, everything is configured correctly
```

---

## 🎯 Quick Test Script

Run these commands in order:

```bash
# 1. Install
pnpm install

# 2. Check environment
Test-Path .env.local

# 3. Start dev server
pnpm dev

# 4. Open browser
# Navigate to http://localhost:3000

# 5. Test basic chat
# Type: "Hello, test message"
# Should get response

# 6. Test PDF upload
# Upload a PDF, wait for processing
# Ask about PDF content

# 7. Test conversation history
# Send messages, refresh page
# Messages should persist
```

---

## ✅ Success Criteria

Your setup is working if:

1. ✅ App starts without errors
2. ✅ Can send messages and get responses
3. ✅ Model badges show correct provider
4. ✅ PDF upload works
5. ✅ Conversations persist after refresh
6. ✅ Cost tracker shows costs
7. ✅ No console errors

---

## 🆘 Need Help?

If something doesn't work:

1. Check browser console (F12)
2. Check terminal logs
3. Verify all API keys are set
4. Try clearing browser cache
5. Reinstall dependencies: `rm -rf node_modules && pnpm install`

---

## 📝 Next Steps After Setup

Once everything works:

1. Upload some PDFs for RAG testing
2. Try different types of questions to test routing
3. Create multiple conversations
4. Test web search with current events
5. Monitor cost tracker

Enjoy your AI assistant! 🚀

