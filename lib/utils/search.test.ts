// Mock deps so we only test cosineSimilarity (no Dexie/embedding in this test file)
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('./embeddings', () => ({ generateEmbedding: jest.fn() }));

import { cosineSimilarity } from './search';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBe(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1);
  });

  it('throws when vectors have different length', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vectors must have the same length');
  });

  it('returns value between -1 and 1 for random vectors', () => {
    const a = [1, 2, 3, 4];
    const b = [0.5, 1, 1.5, 2];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
    expect(sim).toBeGreaterThan(0);
  });
});
