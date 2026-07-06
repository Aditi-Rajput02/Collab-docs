import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/client';
import { User, IUser } from '@/lib/db/models/User';
import { checkLoginLimit } from '@/lib/security/rateLimiter';
import { sharedCallbacks, sharedPages } from './shared.config';
import { z } from 'zod';

const credentialsSchema = z.object({
  email:    z.string().email().toLowerCase(),
  password: z.string().min(1).max(72),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60, // 8 hours — short-lived, limits blast radius of a stolen token
  },
  providers: [
    Credentials({
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Rate-limit by IP — 5 attempts per 15 minutes
        const ip =
          (request as Request | undefined)?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? 'unknown';
        const rateLimit = checkLoginLimit(ip);
        if (!rateLimit.allowed) return null; // NextAuth maps null → CredentialsSignin error

        try {
          await connectDB();

          // +passwordHash explicitly opts-in to the hidden field
          const user = await User
            .findOne({ email: parsed.data.email })
            .select('+passwordHash _id email name')
            .lean<Pick<IUser, '_id' | 'email' | 'name' | 'passwordHash'> | null>();

          if (!user || !user.passwordHash) return null;

          const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
          if (!passwordValid) return null;

          return { id: user._id as string, email: user.email, name: user.name };
        } catch (err) {
          // Surface the real cause in server logs — otherwise every failure
          // (DB unreachable, Atlas IP not whitelisted, etc.) looks identical
          // to "wrong password" from the client's perspective.
          console.error('[auth] authorize() failed:', err);
          return null;
        }
      },
    }),
  ],
  callbacks: sharedCallbacks,
  pages:     sharedPages,
});
