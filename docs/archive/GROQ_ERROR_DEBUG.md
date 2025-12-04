# Groq API Error Debugging

## Common Groq API Errors

### 1. "Invalid API Key" (401)
- **Cause**: API key is missing, incorrect, or expired
- **Fix**: 
  - Check `.env.local` has `GROQ_API_KEY=sk-groq-...`
  - Verify key starts with `sk-groq-`
  - Regenerate key at https://console.groq.com

### 2. "Model not found" (404)
- **Cause**: Model name is incorrect
- **Fix**: Check model names match Groq's available models:
  - `llama-3.1-8b-instant` ✅
  - `llama-3.1-70b-versatile` ✅
  - `llama-3.1-405b-reasoning` ✅
  - `mixtral-8x7b-32768` ✅

### 3. "Bad Request" (400)
- **Cause**: Invalid request parameters
- **Common issues**:
  - `max_tokens` too high (max 8192 for most models)
  - Invalid `temperature` (must be 0-2)
  - Missing required fields

### 4. "Rate limit exceeded" (429)
- **Cause**: Too many requests
- **Fix**: Wait a moment and try again

## How to Debug

1. **Check server logs** (terminal where `pnpm dev` is running)
   - Look for "Groq API error" messages
   - Check the full error response

2. **Check browser console** (F12 → Console)
   - Look for error messages
   - Check network tab for API calls

3. **Test API key directly**:
   ```bash
   curl https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer YOUR_GROQ_API_KEY"
   ```

4. **Verify .env.local**:
   ```bash
   # Check if key is set
   Get-Content .env.local | Select-String "GROQ"
   ```

## Updated Error Handling

The code now:
- ✅ Shows detailed error messages from Groq
- ✅ Validates API key before making request
- ✅ Displays HTTP status codes
- ✅ Shows actual error message from Groq API

## Next Steps

1. Check terminal logs for the actual error
2. Verify your Groq API key is correct
3. Check if the model name is valid
4. Share the exact error message you see

