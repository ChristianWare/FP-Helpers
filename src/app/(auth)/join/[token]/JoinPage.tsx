// app/(auth)/join/[token]/JoinPage.tsx
"use client";

import Link from "next/link";
import RegistrationForm from "@/components/auth/RegistrationForm/RegistrationForm";
import { joinCircle } from "@/actions/circles/joinCircle";
import { RegisterSchemaType } from "@/schemas/RegisterSchema";
import styles from "./JoinPage.module.css";

type Props = {
  token: string;
  circleName: string;
  recipientName: string | null;
  status: "valid" | "expired" | "inactive";
};

export default function JoinPage({
  token,
  circleName,
  recipientName,
  status,
}: Props) {
  const handleSubmit = async (values: RegisterSchemaType) => {
    const result = await joinCircle(token, values);
    return result;
  };

  if (status !== "valid") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.errorIcon}>⚠️</div>
            <h1 className={styles.heading}>
              {status === "expired"
                ? "This invitation has expired"
                : "This invitation is no longer active"}
            </h1>
            <p className={styles.subheading}>
              Please ask whoever shared this link with you for a new one.
            </p>
          </div>
          <Link href='/' className={styles.homeLink}>
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <p className={styles.eyebrow}>You&apos;ve been invited</p>
          <h1 className={styles.heading}>
            {recipientName
              ? `Join the circle helping ${recipientName}`
              : `Join ${circleName}`}
          </h1>
          <p className={styles.subheading}>
            Create your account to start helping out on the rotation.
          </p>
        </div>

        <RegistrationForm
          onSubmit={handleSubmit}
          redirectTo='/dashboard'
          submitLabel='Join the circle'
        />

        <p className={styles.loginPrompt}>
          Already have an account?{" "}
          <Link href='/login' className={styles.loginLink}>
            Sign in
          </Link>{" "}
          to join.
        </p>
      </div>
    </div>
  );
}
