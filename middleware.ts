// middleware.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import authConfig from "./auth.config";

export const { auth: withAuth } = NextAuth(authConfig);

function isSuperAdmin(req: any): boolean {
  return Boolean(req?.auth?.user?.isSuperAdmin);
}

function userHome(req: any) {
  // Super admin lands on a cross-circle admin view;
  // everyone else lands on their personal dashboard
  if (isSuperAdmin(req)) return "/admin";
  return "/dashboard";
}

export default withAuth((req: NextRequest & { auth?: any }) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // NextAuth internal routes — never interfere
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // Cron routes — protected by CRON_SECRET header, not session
  if (pathname.startsWith("/api/cron")) return NextResponse.next();

  // Twilio webhook — signature-verified, not session-auth
  if (pathname.startsWith("/api/webhooks")) return NextResponse.next();

  // Pages where auth is not required
  const authPages = new Set(["/login", "/register"]);
  const publicPages = new Set([
    "/",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ]);

  // Invitation acceptance is public (token acts as the credential)
  const isInvitePage = pathname.startsWith("/invite/");

  if (publicPages.has(pathname) || isInvitePage) return NextResponse.next();

  // Protected areas
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isCircleArea = pathname.startsWith("/circles/");
  const isShiftsArea = pathname.startsWith("/shifts");
  const isMyCircleArea = pathname.startsWith("/my-circle");
  const isSettings = pathname.startsWith("/settings");

  const authedOnly =
    isAdminArea ||
    isDashboard ||
    isCircleArea ||
    isShiftsArea ||
    isMyCircleArea ||
    isSettings;

  const isLoggedIn = Boolean((req as any).auth?.user);

  // Logged-in users shouldn't see login/register — send them home
  if (isLoggedIn && authPages.has(pathname)) {
    return NextResponse.redirect(new URL(userHome(req), nextUrl));
  }

  // Not logged in → redirect to login with a return path
  if (!isLoggedIn && authedOnly) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Non-super-admin attempting to access /admin → bounce to their dashboard
  if (isAdminArea && !isSuperAdmin(req)) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Super admin landing on /dashboard → send to /admin
  // (unless previewing as another user via ?as=)
  if (isDashboard && isSuperAdmin(req)) {
    const isPreview = nextUrl.searchParams.has("as");
    if (!isPreview) {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/webhooks|api/cron|_next|.*\\.(?:css|js(?!on)|mjs|map|jpg|jpeg|png|gif|svg|ico|webp|ttf|woff2?|txt|xml|webmanifest|pdf|zip)).*)",
  ],
};
