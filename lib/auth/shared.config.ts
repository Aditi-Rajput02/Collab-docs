import type { NextAuthConfig } from 'next-auth';

// Single source of truth for callbacks and pages shared between
// lib/auth/config.ts (Node runtime) and lib/auth/edge.config.ts (Edge runtime).
// If JWT shape or redirect paths change, update here only.

export const sharedCallbacks: NextAuthConfig['callbacks'] = {
  jwt({ token, user }) {
    if (user) token.id = user.id;
    return token;
  },
  session({ session, token }) {
    if (token.id) session.user.id = token.id as string;
    return session;
  },
};

export const sharedPages: NextAuthConfig['pages'] = {
  signIn: '/auth/login',
  error:  '/auth/login',
};
