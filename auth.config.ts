// auth.config.ts
import type { NextAuthConfig } from "next-auth";

const authConfig = {
  providers: [],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        token.userId = u.id as string;
        token.firstName = u.firstName ?? null;
        token.lastName = u.lastName ?? null;
        token.phone = u.phone ?? null;
        token.isSuperAdmin = u.isSuperAdmin ?? false;
        token.emailVerified = u.emailVerified ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any) = {
        ...session.user,
        id: token.userId as string,
        userId: token.userId as string,
        firstName: (token.firstName as string) ?? null,
        lastName: (token.lastName as string) ?? null,
        phone: (token.phone as string) ?? null,
        isSuperAdmin: (token.isSuperAdmin as boolean) ?? false,
        emailVerified: (token.emailVerified as string | null) ?? null,
      };
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
