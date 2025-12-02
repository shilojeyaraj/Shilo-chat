/**
 * Text normalization utilities
 * Normalizes special Unicode characters (em dashes, en dashes, etc.) to standard ASCII equivalents
 */

/**
 * Normalize text by replacing special Unicode characters with standard ASCII equivalents
 * - Em dash (—) → regular hyphen (-)
 * - En dash (–) → regular hyphen (-)
 * - Other problematic Unicode characters
 */
export function normalizeText(text: string): string {
  if (!text) return text;

  return text
    // Em dash (—) → regular hyphen
    .replace(/\u2014/g, '-')
    // En dash (–) → regular hyphen
    .replace(/\u2013/g, '-')
    // Horizontal bar (―) → regular hyphen
    .replace(/\u2015/g, '-')
    // Figure dash (‒) → regular hyphen
    .replace(/\u2012/g, '-')
    // Non-breaking hyphen (‑) → regular hyphen
    .replace(/\u2011/g, '-')
    // Left single quotation mark (') → regular apostrophe
    .replace(/\u2018/g, "'")
    // Right single quotation mark (') → regular apostrophe
    .replace(/\u2019/g, "'")
    // Left double quotation mark (") → regular double quote
    .replace(/\u201C/g, '"')
    // Right double quotation mark (") → regular double quote
    .replace(/\u201D/g, '"')
    // Prime (′) → regular apostrophe
    .replace(/\u2032/g, "'")
    // Double prime (″) → regular double quote
    .replace(/\u2033/g, '"')
    // Ellipsis (…) → three periods
    .replace(/\u2026/g, '...')
    // Non-breaking space ( ) → regular space
    .replace(/\u00A0/g, ' ')
    // Zero-width space → remove
    .replace(/\u200B/g, '')
    // Zero-width non-breaking space → remove
    .replace(/\uFEFF/g, '')
    // Soft hyphen → remove
    .replace(/\u00AD/g, '');
}

/**
 * Normalize text for clipboard operations
 * This is the main function to use when copying text to clipboard
 */
export function normalizeForClipboard(text: string): string {
  return normalizeText(text);
}

/**
 * Normalize text when pasting into input fields
 * This ensures pasted text doesn't contain problematic characters
 */
export function normalizeOnPaste(text: string): string {
  return normalizeText(text);
}

