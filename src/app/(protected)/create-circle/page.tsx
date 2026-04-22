// app/(protected)/create-circle/page.tsx
import { auth } from "../../../../auth"; 
import { redirect } from "next/navigation";
import CreateCirclePage from "./CreateCirclePage";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <CreateCirclePage organizerFirstName={session.user.firstName ?? "there"} />
  );
}
