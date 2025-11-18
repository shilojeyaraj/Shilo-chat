# Agent/Model Limits & Capabilities

## ⚠️ Current Limitations

### 1. **Context Window Limits**
- **Groq (Llama 3.3 70B)**: 128K tokens
- **Claude 3.5 Sonnet**: 200K tokens
- **GPT-4o**: 128K tokens
- **Perplexity**: 128K tokens

**Impact**: Very long conversations may hit limits. Hot-warm-cold system helps manage this.

### 2. **Image Processing Limits**
- **Max Image Size**: 20MB per image
- **Supported Formats**: PNG, JPEG, GIF, WebP
- **Max Images per Message**: No hard limit, but performance degrades with many images
- **Groq/Perplexity**: ❌ No image support at all

### 3. **Rate Limits**
- **Groq**: ~30 requests/minute (free tier)
- **OpenAI**: Varies by tier (free: 3/min, paid: higher)
- **Anthropic**: Varies by tier
- **Perplexity**: Varies by plan

### 4. **Token Limits per Request**
- **Groq**: 8,192 max tokens (response)
- **Claude**: 8,192 max tokens (response)
- **GPT-4o**: 16,384 max tokens (response)
- **Perplexity**: 4,096 max tokens (response)

### 5. **Cost Limits**
- **Groq**: Free tier available, then $0.27/1M tokens
- **OpenAI**: No free tier, $5-10/1M tokens
- **Anthropic**: Requires credit purchase first
- **Perplexity**: $5/1M tokens

### 6. **Functionality Limits**
- **Code Execution**: Requires E2B API key (optional, $10/mo)
- **Web Search**: Requires Brave Search API key (free tier: 2,000/month)
- **PDF Parsing**: Server-side only, max file size ~10MB
- **RAG**: Requires OpenAI API key for embeddings

### 7. **Model-Specific Limits**
- **Groq**: Fastest but no vision, no function calling
- **Claude**: Best for code, good vision, slower than Groq
- **GPT-4o**: Best vision, good all-around, most expensive
- **Perplexity**: Best for web search, no vision, no code execution

### 8. **Technical Limits**
- **Concurrent Requests**: Limited by API rate limits
- **Streaming**: All models support it
- **Multimodal**: Only OpenAI and Anthropic
- **Function Calling**: Limited support (not fully implemented)

## ✅ What Works Well

- ✅ Multi-model routing (automatic selection)
- ✅ Image analysis (OpenAI/Anthropic)
- ✅ Code generation and editing
- ✅ Web search integration
- ✅ PDF/document parsing
- ✅ Long context management (hot-warm-cold)
- ✅ Cost optimization
- ✅ Streaming responses

## 🚫 What Doesn't Work

- ❌ Voice input/output (not implemented)
- ❌ Video analysis (not supported by APIs)
- ❌ Real-time collaboration (not implemented)
- ❌ Code execution without E2B key
- ❌ Offline mode (requires API keys)
- ❌ Custom model fine-tuning
- ❌ Batch processing

## 💡 Workarounds

1. **Long Conversations**: Use hot-warm-cold compression
2. **No Vision Model**: System auto-routes to vision-capable models
3. **Rate Limits**: Implement exponential backoff (future)
4. **Cost Control**: Use Groq for most tasks, premium models only when needed
5. **Code Execution**: Optional feature, graceful degradation

## 📊 Recommended Usage

- **Daily Chat**: Groq (fast, cheap)
- **Code Tasks**: Claude 3.5 Sonnet (best quality)
- **Image Analysis**: GPT-4o or Claude 3.5 Sonnet
- **Web Search**: Perplexity (automatic)
- **Long Context**: Claude 3.5 Sonnet (200K tokens)

