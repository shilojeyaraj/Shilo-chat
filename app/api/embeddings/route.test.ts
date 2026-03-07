/**
 * @jest-environment node
 */
import { POST } from './route';

describe('POST /api/embeddings', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 when texts is not an array', async () => {
    const req = new Request('http://localhost/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: 'not-an-array' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid|array/i);
  });

  it('returns 400 when texts is empty array', async () => {
    const req = new Request('http://localhost/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: [] }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when body has no texts key', async () => {
    const req = new Request('http://localhost/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns error (4xx/5xx) when OPENAI_API_KEY is not set or invalid', async () => {
    const orig = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    (process.env as any).NEXT_PUBLIC_OPENAI_API_KEY = undefined;

    const req = new Request('http://localhost/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: ['hello'] }),
    });
    const res = await POST(req as any);

    if (orig !== undefined) process.env.OPENAI_API_KEY = orig;
    // OpenAI may return 500 (key missing) or 401 (invalid key)
    expect(res.status).toBeGreaterThanOrEqual(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});
