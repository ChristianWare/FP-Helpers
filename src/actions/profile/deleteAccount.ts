// actions/profile/deleteAccount.ts
"use server";

import { auth, signOut } from "../../../auth";
import { db } from "@/lib/db";

export async function deleteAccount({
  confirmationText,
}: {
  confirmationText: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in" };
  }

  // Belt-and-suspenders safety — user must type "DELETE" to confirm
  if (confirmationText !== "DELETE") {
    return {
      success: false,
      error: 'Please type "DELETE" exactly to confirm.',
    };
  }

  try {
    await db.user.delete({
      where: { id: session.user.id },
    });

    await signOut({ redirect: false });

    return { success: true };
  } catch (err) {
    console.error("[deleteAccount] Error:", err);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
