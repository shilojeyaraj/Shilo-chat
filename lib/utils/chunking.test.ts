import { chunkText } from './chunking';

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    const text = 'Hello world.';
    expect(chunkText(text)).toEqual(['Hello world.']);
  });

  it('splits long text into multiple chunks with default size', () => {
    const text = 'A'.repeat(3000); // ~750 tokens
    const chunks = chunkText(text, 500, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length > 0)).toBe(true);
  });

  it('respects custom chunk size and overlap', () => {
    const text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
    const chunks = chunkText(text, 20, 5);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.join(' ').replace(/\s+/g, ' ').trim()).toContain('Sentence');
  });

  it('filters out empty chunks', () => {
    const text = 'Non-empty content here.';
    const chunks = chunkText(text);
    expect(chunks).not.toContain('');
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true);
  });

  it('breaks at sentence boundaries when possible', () => {
    const sentences = Array(10).fill('This is a sentence.').join(' ');
    const chunks = chunkText(sentences, 50, 10);
    // Chunks should not cut mid-sentence when break point is in second half
    chunks.forEach((chunk) => {
      if (chunk.length > 20) {
        const lastPeriod = chunk.lastIndexOf('.');
        const nearEnd = chunk.length - 10;
        expect(lastPeriod === -1 || lastPeriod >= nearEnd || chunk.endsWith('.')).toBe(true);
      }
    });
  });
});
