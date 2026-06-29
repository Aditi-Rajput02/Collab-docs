/**
 * Edge-runtime-safe auth config.
 * NO imports from pg, drizzle, or any Node.js-only module.
 * Used exclusively by middleware.ts which runs on the Edge Runtime.
 */
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';

export const edgeAuthConfig: NextAuthConfig = {
  // No adapter here — adapter requires pg which needs crypto (Node-only)
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Credentials provider with no DB lookup — validation happens in the
    // full server config (lib/auth/config.ts). Here we just let it pass
    // so the middleware JWT check works.
    Credentials({}),
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
    error: '/auth/login',
  },
};

export const { auth: edgeAuth } = NextAuth(edgeAuthConfig);
