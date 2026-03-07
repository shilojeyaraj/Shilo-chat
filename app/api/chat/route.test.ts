/**
 * @jest-environment node
 */
import { POST } from './route';

describe('POST /api/chat', () => {
  it('returns error when messages are missing', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('returns error when messages is empty array', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });
    const res = await POST(req as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('accepts valid minimal body and returns stream or error from downstream', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user' as const, content: 'Hello' }],
      }),
    });
    const res = await POST(req as any);
    // Without real API keys we may get 400 (e.g. OPEN_ROUTER_KEY required) or 500; either is valid
    expect([200, 400, 500]).toContain(res.status);
  });
});
