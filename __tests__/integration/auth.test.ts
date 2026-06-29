import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks (must be hoisted before any imports that trigger side-effects) ──────
vi.mock('@/lib/db/client', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const mockFindOne = vi.fn();
const mockCreate  = vi.fn();
vi.mock('@/lib/db/models/User', () => ({
  User: { findOne: mockFindOne, create: mockCreate },
}));

vi.mock('@/lib/security/rateLimiter', () => ({
  checkRegisterLimit: vi.fn().mockReturnValue({ allowed: true, resetIn: 0 }),
  checkLoginLimit:    vi.fn().mockReturnValue({ allowed: true, resetIn: 0 }),
}));

// Import after mocks are set up
const { POST } = await import('@/app/api/auth/register/route');

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/auth/register', {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) });
    mockCreate.mockResolvedValue({ _id: 'user-id-1', email: 'test@example.com' });
  });

  it('returns 400 for invalid email', async () => {
    const res = await POST(makeRequest({ name: 'Alice', email: 'not-email', password: 'password123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await POST(makeRequest({ name: 'Alice', email: 'alice@example.com', password: '1234567' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await POST(makeRequest({ email: 'alice@example.com', password: 'password123' }));
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    mockFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'existing' }) }),
    });

    const res = await POST(makeRequest({ name: 'Alice', email: 'exists@example.com', password: 'password123' }));
    expect(res.status).toBe(409);
  });

  it('returns 201 and user object on success', async () => {
    const res  = await POST(makeRequest({ name: 'Alice', email: 'alice@example.com', password: 'password123' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('test@example.com');
  });

  it('returns 429 when rate-limited', async () => {
    const { checkRegisterLimit } = await import('@/lib/security/rateLimiter');
    vi.mocked(checkRegisterLimit).mockReturnValueOnce({ allowed: false, resetIn: 900 });

    const res = await POST(makeRequest({ name: 'Alice', email: 'alice@example.com', password: 'password123' }));
    expect(res.status).toBe(429);
  });
});
