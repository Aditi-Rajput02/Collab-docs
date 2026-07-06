import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// WebSocket upgrades are not supported in Next.js API routes on Vercel.
// Real-time sync is handled via y-indexeddb offline persistence
// and the /api/documents/[id]/sync endpoint for server persistence.
export function GET() {
  return NextResponse.json(
    { error: 'WebSocket not available — use the sync API instead.' },
    { status: 501 },
  );
}
