// app/(auth)/forgot-password/ForgotPasswordPage.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./ForgotPasswordPage.module.css";
import {
  ForgotPasswordSchema,
  ForgotPasswordSchemaType,
} from "@/schemas/ForgotPasswordSchema";
import { sendPasswordReset } from "@/actions/auth/sendPasswordReset";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordSchemaType>({
    resolver: zodResolver(ForgotPasswordSchema),
    mode: "onTouched",
  });

  const onSubmit = async (values: ForgotPasswordSchemaType) => {
    setError(null);
    setLoading(true);

    const result = await sendPasswordReset(values);

    if (result.success) {
      setSubmittedEmail(values.email);
      setSent(true);
    } else {
      setError(result.error || "Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  if (sent) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>✉️</div>
            <h1 className={styles.successHeading}>Check your email</h1>
            <p className={styles.successText}>
              If an account exists for <strong>{submittedEmail}</strong>,
              we&apos;ve sent a password reset link to it. Open your email and
              tap the link to set a new password.
            </p>
            <p className={styles.successHint}>
              The link expires in 1 hour. It may take a minute to arrive — check
              your spam folder if you don&apos;t see it.
            </p>
            <button
              type='button'
              className={styles.resendBtn}
              onClick={() => {
                const email = getValues("email");
                if (email) onSubmit({ email });
              }}
              disabled={loading}
            >
              {loading ? "Sending..." : "Resend link"}
            </button>
            <Link href='/login' className={styles.backLink}>
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <h1 className={styles.heading}>Forgot your password?</h1>
          <p className={styles.subheading}>
            Enter your email and we&apos;ll send you a link to reset it.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div
            style={{ position: "absolute", left: "-9999px" }}
            aria-hidden='true'
          >
            <label htmlFor='website'>Website (leave blank)</label>
            <input
              id='website'
              type='text'
              tabIndex={-1}
              autoComplete='off'
              {...register("website")}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor='email'>
              Email
            </label>
            <input
              id='email'
              type='email'
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              placeholder='you@example.com'
              autoComplete='email'
              autoFocus
              {...register("email")}
            />
            {errors.email && (
              <span className={styles.fieldError}>{errors.email.message}</span>
            )}
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <span>{error}</span>
            </div>
          )}

          <button type='submit' className={styles.submitBtn} disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className={styles.bottomPrompt}>
          Remembered it?{" "}
          <Link href='/login' className={styles.bottomLink}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
