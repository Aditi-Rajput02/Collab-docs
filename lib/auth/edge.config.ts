/**
 * Edge-runtime-safe auth config.
 * NO imports from mongoose, bcrypt, or any Node.js-only module.
 * Used exclusively by middleware.ts which runs on the Edge Runtime.
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';
import { sharedCallbacks, sharedPages } from './shared.config';

// Google OAuth intentionally excluded until client IDs are configured.
// To enable: add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to env vars,
// then add the Google provider here and in lib/auth/config.ts.

export const edgeAuthConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  providers: [
    // Credentials stub — actual DB validation happens in lib/auth/config.ts.
    // This entry is needed so middleware can verify the JWT structure.
    Credentials({}),
  ],
  callbacks: sharedCallbacks,
  pages:     sharedPages,
};

export const { auth: edgeAuth } = NextAuth(edgeAuthConfig);
