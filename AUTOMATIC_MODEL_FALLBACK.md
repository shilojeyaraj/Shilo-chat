# Automatic Model Fallback for Token Limit Errors

## Overview

When a request is too large for the selected model (e.g., Groq's token-per-minute limit), the system now automatically switches to a compatible model with higher token limits instead of failing with an error.

## Problem

Groq models have strict token-per-minute (TPM) limits:
- **Free tier**: 12,000 TPM
- **Dev tier**: Higher limits (requires upgrade)

When a request exceeds these limits, Groq returns a 413 error:
```
Request too large for model llama-3.3-70b-versatile in organization org_xxx 
service tier on_demand on tokens per minute (TPM): Limit 12000, Requested 12523
```

## Solution

The system now automatically detects token limit errors (413 status code or "request too large" messages) and switches to a model with higher limits:

1. **Error Detection**: Groq provider detects 413 errors and token limit messages
2. **Automatic Fallback**: Chat API automatically retries with Claude 3.5 Sonnet via OpenRouter
3. **Transparent to User**: The fallback happens automatically, user sees seamless response

## Implementation

### 1. Groq Provider Error Detection (`lib/llm/providers.ts`)

Both `call()` and `streamCall()` functions now detect token limit errors:

```typescript
// Check if it's a 413 (Request too large) or token limit error
const isTokenLimitError = response.status === 413 || 
  errorMessage.toLowerCase().includes('request too large') ||
  errorMessage.toLowerCase().includes('tokens per minute') ||
  errorMessage.toLowerCase().includes('tpm');

const error = new Error(`Groq API error (${response.status}): ${errorMessage}`);
(error as any).isTokenLimitError = isTokenLimitError;
(error as any).statusCode = response.status;
throw error;
```

### 2. Chat API Automatic Fallback (`app/api/chat/route.ts`)

The chat route catches token limit errors and automatically retries:

```typescript
try {
  // Try primary provider (e.g., Groq)
  for await (const chunk of finalProvider.streamCall(...)) {
    // Stream response
  }
} catch (error: any) {
  const isTokenLimitError = error?.isTokenLimitError || 
    error?.statusCode === 413 ||
    error?.message?.includes('request too large');
  
  if (isTokenLimitError) {
    // Switch to Claude 3.5 Sonnet via OpenRouter (200K context, higher TPM)
    fallbackConfig = {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      // ... config
    };
    
    // Retry with fallback model
    for await (const chunk of fallbackProvider.streamCall(...)) {
      // Stream response
    }
  }
}
```

## Fallback Model

When a token limit error is detected, the system automatically switches to:

- **Model**: Claude 3.5 Sonnet (via OpenRouter)
- **Context Window**: 200K tokens (vs Groq's 128K)
- **TPM Limits**: Much higher than Groq's free tier
- **Cost**: ~$3/1M tokens (vs Groq's $0.27/1M)

## User Experience

1. User sends a large request
2. Groq returns 413 error (request too large)
3. System automatically detects the error
4. System switches to Claude 3.5 Sonnet
5. Request completes successfully
6. User sees the response (with a note about the model switch in metadata)

## Benefits

- **No Manual Intervention**: Users don't need to manually switch models
- **Seamless Experience**: Large requests just work
- **Cost Optimization**: Still tries cheaper Groq first, only upgrades when needed
- **Transparency**: Metadata shows when fallback was used

## Error Messages Detected

The system detects these error patterns:
- HTTP status code `413` (Request Entity Too Large)
- Error messages containing "request too large"
- Error messages containing "tokens per minute" or "TPM"
- Error messages containing "413"

## Future Enhancements

Potential improvements:
1. **Smart Pre-emptive Switching**: Estimate token count before sending and switch proactively
2. **Multiple Fallback Options**: Try Kimi K2, then Claude, then GPT-4o
3. **Cost-Aware Fallback**: Choose fallback based on cost vs. capability trade-off
4. **User Notification**: Show a toast when automatic fallback occurs

## Testing

To test the automatic fallback:

1. Send a very large message (e.g., paste a long document)
2. The system should automatically switch from Groq to Claude
3. Check the response metadata - it should show `usedFallback: true` and `fallbackReason`

## Related Files

- `lib/llm/providers.ts` - Groq provider error detection
- `app/api/chat/route.ts` - Automatic fallback logic
- `lib/llm/router.ts` - Model routing and fallback chains

