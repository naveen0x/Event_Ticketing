import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config (no Prisma / Node-only APIs), consumed by both
 * `middleware.ts` and the full config in `auth.ts`.
 */
export const authConfig = {
  // Required for self-hosted deployments (Docker, a plain VPS, etc.) — Auth.js
  // only auto-trusts the request Host header on Vercel. Without this, every
  // request in production fails with "UntrustedHost", including sign-in.
  // Safe here because we don't run behind an untrusted/shared proxy layer.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      if (isOnAdmin) return isLoggedIn;
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
