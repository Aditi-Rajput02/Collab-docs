import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db/client';
import { documents } from '@/lib/db/schema';
import { createDocumentSchema } from '@/lib/validations/syncPayload.schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.ownerId, session.user.id));

    return NextResponse.json({ documents: docs });
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

    const body = await req.json();
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const id = crypto.randomUUID();

    // MySQL does not support .returning() — insert then return constructed object
    await db.insert(documents).values({
      id,
      title: parsed.data.title,
      ownerId: session.user.id,
    });

    return NextResponse.json(
      { document: { id, title: parsed.data.title, ownerId: session.user.id } },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/documents]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
