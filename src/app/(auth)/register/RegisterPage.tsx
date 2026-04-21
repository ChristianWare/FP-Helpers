// app/(auth)/register/RegisterPage.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import RegistrationForm from "@/components/auth/RegistrationForm/RegistrationForm";
import { register } from "@/actions/auth/register";
import styles from "./RegisterPage.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <h1 className={styles.heading}>Create your account</h1>
          <p className={styles.subheading}>
            Start a care circle for someone you love
          </p>
        </div>

        <RegistrationForm
          onSubmit={register}
          redirectTo='/dashboard'
          submitLabel='Create account'
        />

        <p className={styles.loginPrompt}>
          Already have an account?{" "}
          <Link href='/login' className={styles.loginLink}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
