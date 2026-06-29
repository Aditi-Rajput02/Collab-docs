import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { connectDB } from '@/lib/db/client';
import { User, IUser } from '@/lib/db/models/User';
import { z } from 'zod';

const credentialsSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT sessions — no adapter needed, no extra DB tables required
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await connectDB();

        const user = await User
          .findOne({ email: parsed.data.email })
          .select('_id email name')
          .lean<Pick<IUser, '_id' | 'email' | 'name'> | null>();

        if (!user) return null;
        return { id: user._id as string, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error:  '/auth/login',
  },
});
