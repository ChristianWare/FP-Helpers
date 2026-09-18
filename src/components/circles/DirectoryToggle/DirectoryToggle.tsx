// components/circles/DirectoryToggle/DirectoryToggle.tsx
//
// "List in the congregation directory" — shown to organizers inside the
// Invite helpers section, since both are about bringing people in.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./DirectoryToggle.module.css";
import { updateDirectoryListing } from "@/actions/circles/updateDirectoryListing";

type Props = {
  circleId: string;
  listed: boolean;
  isMealTrain: boolean;
};

export default function DirectoryToggle({
  circleId,
  listed,
  isMealTrain,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    if (saving) return;
    setSaving(true);
    const next = !listed;
    const result = await updateDirectoryListing(circleId, next);
    if (result.success) {
      toast.success(
        next
          ? "Listed — members can now find this circle"
          : "Removed from the directory",
      );
      router.refresh();
    } else {
      toast.error(result.error ?? "Couldn't save that");
    }
    setSaving(false);
  };

  return (
    <div className={styles.wrap}>
      <button
        type='button'
        role='switch'
        aria-checked={listed}
        className={`${styles.switch} ${listed ? styles.switchOn : ""}`}
        onClick={toggle}
        disabled={saving}
      >
        <span className={styles.knob} aria-hidden='true' />
      </button>
      <div className={styles.text}>
        <p className={styles.label}>
          List in the{" "}
          <Link href='/find' className={styles.link}>
            congregation directory
          </Link>
        </p>
        <p className={styles.help}>
          {listed
            ? `Signed-in members can find this ${isMealTrain ? "meal train" : "circle"} on the Find a circle page and sign up. Address and personal details stay private.`
            : `Off — only people with the invite link can find this ${isMealTrain ? "meal train" : "circle"}. Worth checking with the family before turning it on.`}
        </p>
      </div>
    </div>
  );
}
