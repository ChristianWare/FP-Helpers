// app/(auth)/reset-password/ResetPasswordPage.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./ResetPasswordPage.module.css";
import {
  ResetPasswordSchema,
  ResetPasswordSchemaType,
} from "@/schemas/ResetPasswordSchema";
import { resetPassword } from "@/actions/auth/resetPassword";

type Props = {
  token: string;
};

export default function ResetPasswordPage({ token }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      token,
    },
    mode: "onTouched",
  });

  const onSubmit = async (values: ResetPasswordSchemaType) => {
    setError(null);
    setLoading(true);

    const result = await resetPassword(values);

    if (result.success) {
      setSuccess(true);
      // Send them to login after a short pause so they see the confirmation
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } else {
      setError(result.error || "Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  // No token in URL at all
  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h1 className={styles.errorHeading}>Invalid reset link</h1>
            <p className={styles.errorText}>
              This page needs a reset token. The link you clicked may be
              malformed.
            </p>
            <Link href='/forgot-password' className={styles.submitBtn}>
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state — show briefly before redirecting
  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.successHeading}>Password updated</h1>
            <p className={styles.successText}>
              Your password has been changed. Sending you to the sign-in page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <h1 className={styles.heading}>Set a new password</h1>
          <p className={styles.subheading}>
            Pick something you&apos;ll remember. At least 8 characters.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <input type='hidden' {...register("token")} />

          <div className={styles.field}>
            <label className={styles.label} htmlFor='newPassword'>
              New password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id='newPassword'
                type={showPassword ? "text" : "password"}
                className={`${styles.input} ${errors.newPassword ? styles.inputError : ""}`}
                placeholder='••••••••'
                autoComplete='new-password'
                autoFocus
                {...register("newPassword")}
              />
              <button
                type='button'
                className={styles.eyeBtn}
                onClick={() => setShowPassword((p) => !p)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.newPassword && (
              <span className={styles.fieldError}>
                {errors.newPassword.message}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor='confirmPassword'>
              Confirm new password
            </label>
            <input
              id='confirmPassword'
              type={showPassword ? "text" : "password"}
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
              placeholder='••••••••'
              autoComplete='new-password'
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <span className={styles.fieldError}>
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <span>{error}</span>
              {(error.includes("expired") ||
                error.includes("used") ||
                error.includes("not valid")) && (
                <Link
                  href='/forgot-password'
                  className={styles.errorBannerLink}
                >
                  Request a new link →
                </Link>
              )}
            </div>
          )}

          <button type='submit' className={styles.submitBtn} disabled={loading}>
            {loading ? "Saving..." : "Update password"}
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
