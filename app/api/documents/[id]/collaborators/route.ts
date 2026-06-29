import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { connectDB } from '@/lib/db/client';
import { DocumentCollaborator } from '@/lib/db/models/DocumentCollaborator';
import { User, IUser } from '@/lib/db/models/User';
import { getDocumentRole, canManage } from '@/lib/auth/rbac';
import { z } from 'zod';

const addSchema = z.object({
  email: z.string().email(),
  role:  z.enum(['editor', 'viewer']),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const role = await getDocumentRole(id, session.user.id);
    if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const collabs = await DocumentCollaborator.find({ documentId: id }).lean();
    return NextResponse.json({ collaborators: collabs });
  } catch (err) {
    console.error('[GET collaborators]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const role = await getDocumentRole(id, session.user.id);
    if (!canManage(role)) return NextResponse.json({ error: 'Only owner can add collaborators' }, { status: 403 });

    const body = await req.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const user = await User
      .findOne({ email: parsed.data.email })
      .select('_id')
      .lean<Pick<IUser, '_id'> | null>();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const collab = await DocumentCollaborator.findOneAndUpdate(
      { documentId: id, userId: user._id as string },
      { $set: { role: parsed.data.role, invitedBy: session.user.id } },
      { upsert: true, new: true },
    );

    return NextResponse.json({ collaborator: collab }, { status: 201 });
  } catch (err) {
    console.error('[POST collaborator]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
