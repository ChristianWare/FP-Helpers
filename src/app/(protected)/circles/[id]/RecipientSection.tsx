/* eslint-disable react-hooks/incompatible-library */
// app/(protected)/circles/[id]/RecipientSection.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import styles from "./RecipientSection.module.css";
import { formatPhone } from "@/lib/format";
import {
  UpdateRecipientSchema,
  UpdateRecipientSchemaType,
} from "@/schemas/UpdateRecipientSchema";
import {
  ResetRecipientPasswordSchema,
  ResetRecipientPasswordSchemaType,
} from "@/schemas/ResetRecipientPasswordSchema";
import { updateRecipient } from "@/actions/circles/updateRecipient";
import { resetRecipientPassword } from "@/actions/circles/resetRecipientPassword";

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

type Recipient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type Props = {
  circleId: string;
  recipient: Recipient;
  isAdmin: boolean;
};

export default function RecipientSection({
  circleId,
  recipient,
  isAdmin,
}: Props) {
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);

  // ——— Info form ———

  const {
    register: registerInfo,
    handleSubmit: handleInfoSubmit,
    setValue: setInfoValue,
    reset: resetInfoForm,
    formState: { errors: infoErrors, isDirty: infoIsDirty },
  } = useForm<UpdateRecipientSchemaType>({
    resolver: zodResolver(UpdateRecipientSchema),
    defaultValues: {
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      email: recipient.email,
      phone: formatPhone(recipient.phone),
    },
    mode: "onTouched",
  });

  // Keep form defaults in sync when the recipient prop changes after a save
  useEffect(() => {
    resetInfoForm({
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      email: recipient.email,
      phone: formatPhone(recipient.phone),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipient.firstName, recipient.lastName, recipient.email, recipient.phone]);

  const onInfoSubmit = async (values: UpdateRecipientSchemaType) => {
    setSavingInfo(true);
    const result = await updateRecipient(circleId, values);

    if (result.success) {
      toast.success("Recipient info updated");
      setEditingInfo(false);
    } else {
      toast.error(result.error || "Failed to update");
    }

    setSavingInfo(false);
  };

  const cancelInfoEdit = () => {
    resetInfoForm({
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      email: recipient.email,
      phone: formatPhone(recipient.phone),
    });
    setEditingInfo(false);
  };

  // ——— Password reset form ———

  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    reset: resetPwForm,
    watch: watchPw,
    formState: { errors: pwErrors },
  } = useForm<ResetRecipientPasswordSchemaType>({
    resolver: zodResolver(ResetRecipientPasswordSchema),
    mode: "onTouched",
  });

  const newPasswordValue = watchPw("newPassword");

  const onPwSubmit = async (values: ResetRecipientPasswordSchemaType) => {
    setSavingPw(true);
    const result = await resetRecipientPassword(circleId, values);

    if (result.success) {
      toast.success(
        `Password updated — share the new one with ${recipient.firstName}`,
      );
      resetPwForm();
      setResettingPw(false);
      setShowPasswordField(false);
    } else {
      toast.error(result.error || "Failed to reset password");
    }

    setSavingPw(false);
  };

  const cancelPwReset = () => {
    resetPwForm();
    setResettingPw(false);
    setShowPasswordField(false);
  };

  // ——— Render ———

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Recipient</h2>
        {isAdmin && !editingInfo && (
          <button
            type='button'
            className={styles.editBtn}
            onClick={() => setEditingInfo(true)}
          >
            Edit
          </button>
        )}
      </div>

      {/* ——— Info block ——— */}
      {editingInfo ? (
        <form
          onSubmit={handleInfoSubmit(onInfoSubmit)}
          className={styles.form}
        >
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor='recipientFirstName'>
                First name
              </label>
              <input
                id='recipientFirstName'
                type='text'
                className={`${styles.input} ${infoErrors.firstName ? styles.inputError : ""}`}
                {...registerInfo("firstName")}
              />
              {infoErrors.firstName && (
                <span className={styles.fieldError}>
                  {infoErrors.firstName.message}
                </span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor='recipientLastName'>
                Last name
              </label>
              <input
                id='recipientLastName'
                type='text'
                className={`${styles.input} ${infoErrors.lastName ? styles.inputError : ""}`}
                {...registerInfo("lastName")}
              />
              {infoErrors.lastName && (
                <span className={styles.fieldError}>
                  {infoErrors.lastName.message}
                </span>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor='recipientEmail'>
              Email
            </label>
            <input
              id='recipientEmail'
              type='email'
              className={`${styles.input} ${infoErrors.email ? styles.inputError : ""}`}
              {...registerInfo("email")}
            />
            {infoErrors.email && (
              <span className={styles.fieldError}>
                {infoErrors.email.message}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor='recipientPhone'>
              Phone number
            </label>
            <input
              id='recipientPhone'
              type='tel'
              className={`${styles.input} ${infoErrors.phone ? styles.inputError : ""}`}
              {...registerInfo("phone", {
                onChange: (e) => {
                  const formatted = formatPhoneInput(e.target.value);
                  setInfoValue("phone", formatted, {
                    shouldValidate: false,
                    shouldDirty: true,
                  });
                },
              })}
            />
            {infoErrors.phone && (
              <span className={styles.fieldError}>
                {infoErrors.phone.message}
              </span>
            )}
          </div>

          <div className={styles.formActions}>
            <button
              type='button'
              className={styles.cancelBtn}
              onClick={cancelInfoEdit}
              disabled={savingInfo}
            >
              Cancel
            </button>
            <button
              type='submit'
              className={styles.primaryBtn}
              disabled={savingInfo || !infoIsDirty}
            >
              {savingInfo ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.fieldLabel}>Name</span>
            <p className={styles.infoValue}>
              {recipient.firstName} {recipient.lastName}
            </p>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.fieldLabel}>Email</span>
            <p className={styles.infoValue}>{recipient.email}</p>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.fieldLabel}>Phone number</span>
            <a
              href={`tel:${recipient.phone}`}
              className={styles.infoValueLink}
            >
              {formatPhone(recipient.phone)}
            </a>
          </div>
        </div>
      )}

      {/* ——— Password block (admin only) ——— */}
      {isAdmin && !editingInfo && (
        <div className={styles.passwordBlock}>
          {!resettingPw ? (
            <div className={styles.passwordViewRow}>
              <div className={styles.passwordViewLeft}>
                <span className={styles.fieldLabel}>Login password</span>
                <p className={styles.passwordMasked}>••••••••••</p>
                <p className={styles.passwordNote}>
                  Passwords are stored encrypted and can&apos;t be shown. You
                  can set a new one and share it with {recipient.firstName}.
                </p>
              </div>
              <button
                type='button'
                className={styles.resetBtn}
                onClick={() => setResettingPw(true)}
              >
                Reset password
              </button>
            </div>
          ) : (
            <form
              onSubmit={handlePwSubmit(onPwSubmit)}
              className={styles.form}
            >
              <p className={styles.formHint}>
                Set a new password for {recipient.firstName} {recipient.lastName}
                . After saving, share it with them by text or call.
              </p>

              <div className={styles.field}>
                <label className={styles.label} htmlFor='recipientNewPw'>
                  New password
                </label>
                <div className={styles.pwInputWrap}>
                  <input
                    id='recipientNewPw'
                    type={showPasswordField ? "text" : "password"}
                    autoComplete='new-password'
                    className={`${styles.input} ${pwErrors.newPassword ? styles.inputError : ""}`}
                    {...registerPw("newPassword")}
                  />
                  <button
                    type='button'
                    className={styles.pwToggle}
                    onClick={() => setShowPasswordField((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPasswordField ? "Hide" : "Show"}
                  </button>
                </div>
                {pwErrors.newPassword && (
                  <span className={styles.fieldError}>
                    {pwErrors.newPassword.message}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor='recipientConfirmPw'>
                  Confirm new password
                </label>
                <input
                  id='recipientConfirmPw'
                  type={showPasswordField ? "text" : "password"}
                  autoComplete='new-password'
                  className={`${styles.input} ${pwErrors.confirmPassword ? styles.inputError : ""}`}
                  {...registerPw("confirmPassword")}
                />
                {pwErrors.confirmPassword && (
                  <span className={styles.fieldError}>
                    {pwErrors.confirmPassword.message}
                  </span>
                )}
              </div>

              {newPasswordValue && showPasswordField && (
                <div className={styles.pwPreview}>
                  <span className={styles.fieldLabel}>You are setting</span>
                  <code className={styles.pwPreviewCode}>
                    {newPasswordValue}
                  </code>
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type='button'
                  className={styles.cancelBtn}
                  onClick={cancelPwReset}
                  disabled={savingPw}
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className={styles.primaryBtn}
                  disabled={savingPw}
                >
                  {savingPw ? "Saving..." : "Save new password"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}