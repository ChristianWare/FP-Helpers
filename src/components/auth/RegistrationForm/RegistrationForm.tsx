// components/auth/RegistrationForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { RegisterSchema, RegisterSchemaType } from "@/schemas/RegisterSchema";
import styles from "./RegistrationForm.module.css";

type Props = {
  // What server action to call — register (plain signup) or joinCircle (signup + add to circle)
  onSubmit: (values: RegisterSchemaType) => Promise<{
    error?: string;
    success?: boolean;
    signInFailed?: boolean;
  }>;
  // Where to redirect on success
  redirectTo: string;
  // Button label (defaults to "Create account")
  submitLabel?: string;
};

export default function RegistrationForm({
  onSubmit,
  redirectTo,
  submitLabel = "Create account",
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterSchemaType>({
    resolver: zodResolver(RegisterSchema),
  });

  const handleFormSubmit = async (values: RegisterSchemaType) => {
    setError(null);
    setLoading(true);

    const result = await onSubmit(values);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result?.signInFailed) {
      // Account created but auto-sign-in didn't work
      router.push("/login");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(handleFormSubmit)}>
      {/* Honeypot */}
      <input
        type='text'
        {...register("website")}
        autoComplete='off'
        tabIndex={-1}
        aria-hidden='true'
        style={{ display: "none" }}
      />

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor='firstName'>
            First name
          </label>
          <input
            id='firstName'
            type='text'
            className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
            placeholder='Alex'
            autoComplete='given-name'
            {...register("firstName")}
          />
          {errors.firstName && (
            <span className={styles.fieldError}>
              {errors.firstName.message}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor='lastName'>
            Last name
          </label>
          <input
            id='lastName'
            type='text'
            className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
            placeholder='Johnson'
            autoComplete='family-name'
            {...register("lastName")}
          />
          {errors.lastName && (
            <span className={styles.fieldError}>{errors.lastName.message}</span>
          )}
        </div>
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
          {...register("email")}
        />
        {errors.email && (
          <span className={styles.fieldError}>{errors.email.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor='phone'>
          Phone number
        </label>
        <input
          id='phone'
          type='tel'
          className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
          placeholder='(555) 123-4567'
          autoComplete='tel'
          {...register("phone")}
        />
        <span className={styles.helpText}>
          So the person you&apos;re helping can reach you on the day.
        </span>
        {errors.phone && (
          <span className={styles.fieldError}>{errors.phone.message}</span>
        )}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor='password'>
            Password
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id='password'
              type={showPassword ? "text" : "password"}
              className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
              placeholder='••••••••'
              autoComplete='new-password'
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
            <span className={styles.fieldError}>{errors.password.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor='confirmPassword'>
            Confirm
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id='confirmPassword'
              type={showConfirmPassword ? "text" : "password"}
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
              placeholder='••••••••'
              autoComplete='new-password'
              {...register("confirmPassword")}
            />
            <button
              type='button'
              className={styles.eyeBtn}
              onClick={() => setShowConfirmPassword((p) => !p)}
              tabIndex={-1}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className={styles.fieldError}>
              {errors.confirmPassword.message}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
        </div>
      )}

      <button type='submit' className={styles.submitBtn} disabled={loading}>
        {loading ? "Creating account..." : submitLabel}
      </button>
    </form>
  );
}
