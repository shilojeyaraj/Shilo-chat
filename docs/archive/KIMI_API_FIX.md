# Fixing Kimi API "Invalid Authentication" Error

## 🔍 Common Causes

The "Invalid Authentication" error from Kimi API usually means one of these:

### 1. **API Key Not Set in Vercel** (Most Common)
- The `KIMI_API_KEY` environment variable is missing in Vercel
- Even if it works locally, Vercel needs it separately

### 2. **API Key Has Extra Spaces**
- Copying the key might include leading/trailing spaces
- The key should be exactly as shown in the Moonshot dashboard

### 3. **Wrong API Key**
- Using an old/expired key
- Using a key from a different account
- Key was regenerated but old one is still in Vercel

### 4. **Not Redeployed After Adding Key**
- Vercel needs a redeploy to pick up new environment variables
- Just adding the variable isn't enough - must redeploy

### 5. **Key Format Issue**
- Kimi API keys should start with specific prefixes
- Make sure you copied the full key (they're usually long)

## ✅ How to Fix

### Step 1: Verify Your Key Works
1. Go to https://platform.moonshot.cn
2. Log in to your account
3. Go to "API Keys" section
4. Check if your key is active
5. If needed, create a new key

### Step 2: Add Key to Vercel
1. Go to Vercel Dashboard → Your Project
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Name: `KIMI_API_KEY`
5. Value: Paste your key (make sure no extra spaces!)
6. Select **Production**, **Preview**, and **Development** (or just Production)
7. Click **Save**

### Step 3: Verify the Key
- Make sure there are NO spaces before or after the key
- The key should be one continuous string
- Don't include quotes around the key

### Step 4: Redeploy
**IMPORTANT:** After adding environment variables, you MUST redeploy:

**Option A: Automatic Redeploy**
- Vercel will show a "Redeploy" button after adding variables
- Click it to trigger a new deployment

**Option B: Manual Redeploy**
- Go to **Deployments** tab
- Click the **⋯** menu on the latest deployment
- Click **Redeploy**

**Option C: Push a Commit**
- Make any small change (add a comment, etc.)
- Push to trigger auto-deploy

### Step 5: Verify It Works
1. After redeploy completes, try using the chatbot
2. Check Vercel logs if it still fails
3. The new error messages will show if the key is detected

## 🧪 Test Your Key Locally First

Before deploying, test in your local `.env.local`:

```bash
# In .env.local
KIMI_API_KEY=sk-your-actual-key-here
```

Then test locally:
```bash
pnpm dev
```

If it works locally but not on Vercel, it's definitely a Vercel environment variable issue.

## 🔑 Getting a New Kimi API Key

If your key doesn't work:

1. Go to https://platform.moonshot.cn
2. Log in
3. Navigate to **API Keys** or **开发者** (Developer)
4. Click **Create API Key** or **创建密钥**
5. Copy the key immediately (you might not see it again)
6. Add it to Vercel following Step 2 above

## 📝 Key Format

Kimi API keys typically:
- Start with `sk-` or similar prefix
- Are quite long (50+ characters)
- Should be kept secret (never commit to git)

## ⚠️ Common Mistakes

1. ❌ Adding key but forgetting to redeploy
2. ❌ Including quotes: `KIMI_API_KEY="sk-..."` (don't use quotes)
3. ❌ Extra spaces: `KIMI_API_KEY= sk-...` (no space after =)
4. ❌ Wrong variable name: `KIMI_KEY` instead of `KIMI_API_KEY`
5. ❌ Using local `.env.local` key that's expired

## 🆘 Still Not Working?

If you've tried everything:

1. **Check Vercel Logs:**
   - Go to Vercel → Your Project → Logs
   - Look for the exact error message
   - The new error handler will show if the key is detected

2. **Verify Key Format:**
   - Make sure it's the full key from Moonshot dashboard
   - No truncation, no extra characters

3. **Try a New Key:**
   - Generate a fresh key from Moonshot
   - Delete the old one in Vercel
   - Add the new one
   - Redeploy

4. **Check Account Status:**
   - Make sure your Moonshot account is active
   - Check if you have credits/balance
   - Verify the key hasn't been revoked

