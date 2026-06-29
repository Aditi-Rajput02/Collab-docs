import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/client';
import { User } from '@/lib/db/models/User';
import { checkRegisterLimit } from '@/lib/security/rateLimiter';
import { z } from 'zod';

const registerSchema = z.object({
  name:     z.string().min(1).max(100).trim(),
  email:    z.string().email().toLowerCase(),
  password: z.string().min(8).max(72), // bcrypt truncates at 72 bytes
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rateLimit = checkRegisterLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } },
      );
    }

    await connectDB();

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await User.findOne({ email }).select('_id').lean();
    if (existing) {
      // Return same message as "not found" to avoid email enumeration
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({ name, email, passwordHash, provider: 'credentials' });

    return NextResponse.json({ user: { id: user._id, email: user.email } }, { status: 201 });
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
