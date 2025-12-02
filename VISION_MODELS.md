# Vision/Image Support by Model

## ✅ Models That Support Images

### **Anthropic (Claude)**
- ✅ **Claude 3.5 Sonnet** (`claude-3-5-sonnet-20240620`)
  - Excellent vision capabilities
  - Can analyze images, screenshots, diagrams, charts
  - Supports base64 encoded images
  - **Cost**: $3/1M tokens
  - **Recommended for**: Image analysis, document understanding, visual content

- ✅ **Claude 3 Opus** (`claude-3-opus-20240229`)
  - Best vision quality (if available)
  - **Cost**: Higher than Sonnet

### **OpenAI**
- ✅ **GPT-4 Turbo with Vision** (`gpt-4-turbo-preview` or `gpt-4-vision-preview`)
  - Strong vision capabilities
  - Can analyze images, screenshots, diagrams
  - Supports base64 encoded images
  - **Cost**: $10/1M tokens
  - **Recommended for**: Image analysis, visual content understanding

- ✅ **GPT-4o** (`gpt-4o`)
  - Latest vision model
  - Improved image understanding
  - **Cost**: Varies

## ❌ Models That Do NOT Support Images

### **Groq**
- ❌ **Llama 3.1 8B Instant** (`llama-3.1-8b-instant`)
  - Text-only, no vision support
  - Images will be ignored or cause errors

- ❌ **Llama 3.3 70B Versatile** (`llama-3.3-70b-versatile`)
  - Text-only, no vision support
  - Images will be ignored or cause errors

### **Perplexity**
- ❌ **Llama 3.1 Sonar Large** (`llama-3.1-sonar-large-128k-online`)
  - Text-only, optimized for web search
  - No vision capabilities

## 🔄 Automatic Routing

When you send an image:
1. **System automatically detects** images in your message
2. **Routes to vision-capable model** (Claude 3.5 Sonnet by default)
3. **Prevents errors** by not sending images to text-only models

## 📝 Manual Override

If you manually select a model:
- ✅ **Safe to use with images**: Claude 3.5 Sonnet, GPT-4 Turbo, GPT-4 Vision
- ❌ **Will cause errors with images**: Any Groq model, Perplexity models

## 💡 Best Practices

1. **For image analysis**: Use Claude 3.5 Sonnet (best quality/cost ratio)
2. **For text-only tasks**: Use Groq (fastest and cheapest)
3. **Let auto-routing handle it**: The system automatically selects the right model
4. **Check model badge**: The UI shows which model is handling your request

## 🔧 Technical Details

- **Image Format**: Base64 encoded (data:image/png;base64,...)
- **Supported Types**: PNG, JPEG, GIF, WebP
- **Max Size**: Varies by provider (typically 20MB)
- **Processing**: Images are automatically converted to the correct format for each provider

