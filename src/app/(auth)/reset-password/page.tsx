// app/(auth)/reset-password/page.tsx
import ResetPasswordPage from "./ResetPasswordPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordPage token={token ?? ""} />;
}
