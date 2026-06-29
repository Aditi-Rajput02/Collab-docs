import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db/client', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const mockDocFind = vi.fn();
const mockDocCreate = vi.fn();
vi.mock('@/lib/db/models/Document', () => ({
  Document: { find: mockDocFind, create: mockDocCreate },
}));

const mockAuth = vi.fn();
vi.mock('@/lib/auth/config', () => ({ auth: mockAuth }));

const { GET, POST } = await import('@/app/api/documents/route');

function makeRequest(method: string, body?: object) {
  return new NextRequest('http://localhost/api/documents', {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/documents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns document list for authenticated user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockDocFind.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      sort:   vi.fn().mockReturnThis(),
      lean:   vi.fn().mockResolvedValue([
        { _id: 'doc-1', title: 'My Doc', createdAt: new Date(), updatedAt: new Date() },
      ]),
    });

    const res  = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.documents).toHaveLength(1);
    expect(body.documents[0].title).toBe('My Doc');
  });
});

describe('POST /api/documents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(makeRequest('POST', { title: 'New Doc' }));
    expect(res.status).toBe(401);
  });

  it('creates document and returns 201', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockDocCreate.mockResolvedValue({ _id: 'doc-new', title: 'New Doc', ownerId: 'user-1' });

    const res  = await POST(makeRequest('POST', { title: 'New Doc' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.document.title).toBe('New Doc');
  });

  it('uses default title when none provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockDocCreate.mockResolvedValue({ _id: 'doc-new', title: 'Untitled Document', ownerId: 'user-1' });

    const res  = await POST(makeRequest('POST', {}));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.document.title).toBe('Untitled Document');
  });
});
