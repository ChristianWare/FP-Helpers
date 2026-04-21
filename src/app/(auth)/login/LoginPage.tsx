// app/(auth)/login/LoginPage.tsx
"use client";

import styles from "./LoginPage.module.css";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LoginSchema, LoginSchemaType } from "@/schemas/LoginSchema";
import { login } from "@/actions/auth/login";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (values: LoginSchemaType) => {
    setError(null);
    setLoading(true);

    const result = await login(values);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

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
          <h1 className={styles.heading}>Welcome back</h1>
          <p className={styles.subheading}>
            Sign in to Friendship Park Helpers
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
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
              {...register("email")}
            />
            {errors.email && (
              <span className={styles.fieldError}>{errors.email.message}</span>
            )}
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor='password'>
                Password
              </label>
              <Link href='/forgot-password' className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>
            <div className={styles.passwordWrapper}>
              <input
                id='password'
                type={showPassword ? "text" : "password"}
                className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                placeholder='••••••••'
                autoComplete='current-password'
                {...register("password")}
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
            {errors.password && (
              <span className={styles.fieldError}>
                {errors.password.message}
              </span>
            )}
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <span>{error}</span>
            </div>
          )}

          <button type='submit' className={styles.submitBtn} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className={styles.registerPrompt}>
          Don&apos;t have an account?{" "}
          <Link href='/register' className={styles.registerLink}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
