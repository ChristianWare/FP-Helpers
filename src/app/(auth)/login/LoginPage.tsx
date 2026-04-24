/* eslint-disable @typescript-eslint/no-unused-vars */
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

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleMagicLink = async () => {
    if (!email) {
      setError("Please enter your email first");
      return;
    }

    setError(null);
    setLoading(true);

    // Check if this email belongs to a magic-link user
    const check = await checkEmail(email);

    if (check.error) {
      setError(check.error);
      setLoading(false);
      return;
    }

    // If the user doesn't exist, pretend we sent a link (privacy)
    // If the user exists, actually send the link
    if (check.exists) {
      const sendResult = await sendMagicLink(email);
      if (sendResult.error) {
        setError(sendResult.error);
        setLoading(false);
        return;
      }
    }

    setMagicLinkSent(true);
    setLoading(false);
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
      </div>
    );
  }

  // Magic link sent confirmation screen
  if (magicLinkSent) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
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
              onClick={() => {
                setMagicLinkSent(false);
                setError(null);
              }}
            >
              ← Back to sign in
            </button>
          </div>
        </div>
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

        <form className={styles.form} onSubmit={handleSubmit}>
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
            disabled={loading || !email || !password}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* <div className={styles.divider}>
          <span>or</span>
        </div>

        <button
          type='button'
          className={styles.magicLinkBtn}
          onClick={handleMagicLink}
          disabled={loading || !email}
        >
          Email me a sign-in link
        </button> */}

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
