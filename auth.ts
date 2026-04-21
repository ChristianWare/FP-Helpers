// auth.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Nodemailer from "next-auth/providers/nodemailer";
import bcryptjs from "bcryptjs";
import { Resend } from "resend";

import authConfig from "./auth.config";
import { db } from "@/lib/db";
import { buildMagicLinkEmail } from "@/lib/emails/magicLink";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      userId?: string;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      isSuperAdmin?: boolean;
      emailVerified?: Date | null;
    } & DefaultSession["user"];
  }

  interface JWT {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    isSuperAdmin?: boolean;
    emailVerified?: Date | null;
  }
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),

  // 60-day session
  session: {
    strategy: "jwt",
    maxAge: 60 * 24 * 60 * 60, // 60 days in seconds
  },

  providers: [
    Credentials({
      name: "Credentials",
      authorize: async (credentials) => {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };

        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!user || !user.password) return null;

        const isValid = await bcryptjs.compare(password, user.password);
        return isValid ? user : null;
      },
    }),

    // Magic link via Resend
    Nodemailer({
      // `server` is unused because we're overriding sendVerificationRequest
      // to use Resend's HTTP API directly — cleaner than SMTP
      server: { host: "unused", port: 0, auth: { user: "", pass: "" } },
      from: process.env.EMAIL_FROM,
      maxAge: 60 * 60, // 1-hour magic link expiry

      async sendVerificationRequest({ identifier: email, url }) {
        try {
          const { subject, html, text } = buildMagicLinkEmail({ email, url });

          const result = await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: email,
            subject,
            html,
            text,
          });

          if (result.error) {
            console.error("[magic-link] Resend error:", result.error);
            throw new Error("Failed to send magic link");
          }
        } catch (error) {
          console.error("[magic-link] Send error:", error);
          throw new Error("Failed to send magic link");
        }
      },
    }),
  ],

  events: {
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },

  callbacks: {
    async jwt({ token }) {
      const userId = token.sub;

      const user = userId
        ? await db.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              isSuperAdmin: true,
              emailVerified: true,
            },
          })
        : token.email
          ? await db.user.findUnique({
              where: { email: token.email as string },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                isSuperAdmin: true,
                emailVerified: true,
              },
            })
          : null;

      if (!user) return token;

      token.userId = user.id;
      token.firstName = user.firstName;
      token.lastName = user.lastName;
      token.phone = user.phone;
      token.isSuperAdmin = user.isSuperAdmin;
      token.emailVerified = user.emailVerified ?? null;

      return token;
    },

    async session({ session, token }: { session: any; token: any }) {
      if (token.userId) {
        session.user.id = token.userId;
        session.user.userId = token.userId;
      }
      session.user.firstName = token.firstName ?? null;
      session.user.lastName = token.lastName ?? null;
      session.user.phone = token.phone ?? null;
      session.user.isSuperAdmin = token.isSuperAdmin ?? false;
      if ("emailVerified" in token) {
        session.user.emailVerified = (token.emailVerified as Date) ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    verifyRequest: "/check-email",
  },
});
