import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // AI summarize — implement with GROQ_API_KEY when configured
  return NextResponse.json({ error: 'AI not configured' }, { status: 501 });
}
