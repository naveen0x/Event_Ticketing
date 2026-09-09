import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config (no Prisma / Node-only APIs), consumed by both
 * `middleware.ts` and the full config in `auth.ts`.
 */
export const authConfig = {
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
