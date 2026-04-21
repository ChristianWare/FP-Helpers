// app/(auth)/login/LoginPage.tsx
"use client";

import styles from "./LoginPage.module.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { checkEmail } from "@/actions/auth/checkEmail";
import { sendMagicLink } from "@/actions/auth/sendMagicLink";
import { login } from "@/actions/auth/login";

type Step = "email" | "password" | "magic-link-sent";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await checkEmail(email);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!result.exists) {
      // Don't reveal whether the user exists; just say we sent a link
      setStep("magic-link-sent");
      setLoading(false);
      return;
    }

    if (result.hasPassword) {
      // Password user — show password field
      setStep("password");
      setLoading(false);
      return;
    }

    // Magic-link user — actually send the link
    const sendResult = await sendMagicLink(email);
    if (sendResult.error) {
      setError(sendResult.error);
      setLoading(false);
      return;
    }

    setStep("magic-link-sent");
    setLoading(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login({ email, password });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleBackToEmail = () => {
    setStep("email");
    setPassword("");
    setError(null);
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
        {step === "email" && (
          <>
            <div className={styles.cardTop}>
              <h1 className={styles.heading}>Welcome back</h1>
              <p className={styles.subheading}>
                Sign in to Friendship Park Helpers
              </p>
            </div>

            <form className={styles.form} onSubmit={handleEmailSubmit}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor='email'>
                  Email
                </label>
                <input
                  id='email'
                  type='email'
                  className={styles.input}
                  placeholder='you@example.com'
                  autoComplete='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className={styles.errorBanner}>
                  <span>{error}</span>
                </div>
              )}

              <button
                type='submit'
                className={styles.submitBtn}
                disabled={loading || !email}
              >
                {loading ? "Checking..." : "Continue"}
              </button>
            </form>

            <p className={styles.registerPrompt}>
              Don&apos;t have an account?{" "}
              <Link href='/register' className={styles.registerLink}>
                Create one
              </Link>
            </p>
          </>
        )}

        {step === "password" && (
          <>
            <div className={styles.cardTop}>
              <h1 className={styles.heading}>Welcome back</h1>
              <p className={styles.subheading}>
                Signing in as <strong>{email}</strong>
              </p>
            </div>

            <form className={styles.form} onSubmit={handlePasswordSubmit}>
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
                    className={styles.input}
                    placeholder='••••••••'
                    autoComplete='current-password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
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
              </div>

              {error && (
                <div className={styles.errorBanner}>
                  <span>{error}</span>
                </div>
              )}

              <button
                type='submit'
                className={styles.submitBtn}
                disabled={loading || !password}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <button
                type='button'
                className={styles.backBtn}
                onClick={handleBackToEmail}
              >
                ← Use a different email
              </button>
            </form>
          </>
        )}

        {step === "magic-link-sent" && (
          <div className={styles.successState}>
            <div className={styles.successIcon}>✉️</div>
            <h1 className={styles.successHeading}>Check your email</h1>
            <p className={styles.successText}>
              We sent a sign-in link to <strong>{email}</strong>. Open your
              email and tap the link to sign in.
            </p>
            <p className={styles.successHint}>
              The link is valid for 1 hour. It may take a minute to arrive —
              check your spam folder if you don&apos;t see it.
            </p>
            <button
              type='button'
              className={styles.backBtn}
              onClick={handleBackToEmail}
            >
              ← Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
