import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { connectDB } from '@/lib/db/client';
import { Document } from '@/lib/db/models/Document';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1).max(500).default('Untitled Document'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);

    await connectDB();

    const docs = await Document
      .find({ ownerId: session.user.id, deletedAt: null })
      .select('_id title createdAt updatedAt isPublic sizeBytes')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      documents: docs.map(d => ({ ...d, id: d._id })),
      hasMore: docs.length === limit,
    });
  } catch (err) {
    console.error('[GET /api/documents]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();

    const doc = await Document.create({
      title:   parsed.data.title,
      ownerId: session.user.id,
    });

    return NextResponse.json(
      { document: { id: doc._id, title: doc.title, ownerId: doc.ownerId } },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/documents]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
