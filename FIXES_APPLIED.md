# Fixes Applied

## Issue Found

The build was failing because Next.js was trying to bundle `onnxruntime-node`, which is a native Node.js module that can't be bundled for the browser.

## Fixes Applied

### 1. Updated `next.config.js`
- Added webpack configuration to exclude native Node.js modules from client bundle
- Added rule to ignore `.node` files (native bindings)
- This prevents Next.js from trying to bundle server-only code

### 2. Updated `lib/utils/embeddings.ts`
- Configured `@xenova/transformers` to use web backend only
- Disabled Node.js backend to prevent bundling issues
- This ensures client-side embeddings use browser-compatible code

## Testing

The dev server should now start without errors. Try:

```bash
pnpm dev
```

If you still see errors, try:

```bash
# Clear Next.js cache
rm -rf .next
pnpm dev
```

## What This Means

- ✅ Client-side embeddings will use web backend (browser-compatible)
- ✅ No native Node.js modules in browser bundle
- ✅ Build should succeed
- ✅ App should run in browser

## Note

If you have OpenAI API key configured, embeddings will use OpenAI API (preferred). The client-side fallback is only used if OpenAI key is missing.

