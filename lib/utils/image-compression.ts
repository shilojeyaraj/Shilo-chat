/**
 * Image Compression Utility
 * Compresses and resizes images to reduce token usage for vision models
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG
  maxSizeKB?: number; // Target max file size in KB
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 2048, // Max width for vision models (OpenAI recommends 2048px)
  maxHeight: 2048, // Max height
  quality: 0.85, // Good quality with size reduction
  maxSizeKB: 500, // Target: 500KB per image (reduces from potentially 5MB+)
};

/**
 * Compress a base64 image data URL
 * Returns compressed image as base64 data URL
 */
export async function compressImage(
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > opts.maxWidth! || height > opts.maxHeight!) {
        const ratio = Math.min(
          opts.maxWidth! / width,
          opts.maxHeight! / height
        );
        width = width * ratio;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob and compress
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // Check if we need further compression
          const sizeKB = blob.size / 1024;
          if (sizeKB > opts.maxSizeKB! && opts.quality! > 0.5) {
            // Recursively compress with lower quality
            const reader = new FileReader();
            reader.onload = (e) => {
              compressImage(e.target?.result as string, {
                ...opts,
                quality: opts.quality! * 0.8, // Reduce quality further
              })
                .then(resolve)
                .catch(reject);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          } else {
            // Convert to base64
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve(e.target?.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }
        },
        'image/jpeg', // Use JPEG for better compression
        opts.quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
}

/**
 * Compress multiple images
 */
export async function compressImages(
  images: string[],
  options: CompressionOptions = {}
): Promise<string[]> {
  return Promise.all(
    images.map((img) => compressImage(img, options))
  );
}

/**
 * Estimate token count for a base64 image
 * More accurate than text-based estimation
 */
export function estimateImageTokens(dataUrl: string): number {
  // Extract base64 part
  const base64Match = dataUrl.match(/base64,([A-Za-z0-9+/=]+)/);
  if (!base64Match) return 0;

  const base64Length = base64Match[1].length;
  // For GPT-4o: roughly 85 tokens per 1000 base64 characters
  // This is more accurate than the 1 token per 4 chars estimate
  return Math.ceil((base64Length / 1000) * 85);
}

/**
 * Check if image needs compression
 */
export function needsCompression(dataUrl: string, maxTokens: number = 50000): boolean {
  const tokens = estimateImageTokens(dataUrl);
  return tokens > maxTokens;
}

