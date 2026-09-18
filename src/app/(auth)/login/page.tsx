// app/(auth)/login/page.tsx
import LoginPage from "./LoginPage";

/**
 * Only ever redirect to a path on THIS site. Anything else — a full URL,
 * "//evil.com", a backslash trick — falls back to the dashboard.
 */
function safeNextPath(value: string | string[] | undefined): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;
  if (value.startsWith("/login") || value.startsWith("/register")) return null;
  return value;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;

  // `?next=` is set by the middleware (you were sent here from a protected
  // page) and by invite links ("Sign in" on /join/[token] → back to the invite).
  return <LoginPage nextPath={safeNextPath(next)} />;
}
