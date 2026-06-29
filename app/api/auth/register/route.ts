import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/client';
import { User } from '@/lib/db/models/User';
import { z } from 'zod';

const registerSchema = z.object({
  name:     z.string().min(1).max(100).trim(),
  email:    z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, email } = parsed.data;

    const existing = await User.findOne({ email }).select('_id').lean();
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const user = await User.create({ name, email, provider: 'credentials' });

    return NextResponse.json({ user: { id: user._id, email: user.email } }, { status: 201 });
  } catch (err) {
    console.error('[register]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
