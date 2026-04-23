// app/(protected)/profile/ProfilePage.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import styles from "./ProfilePage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Modal from "@/components/shared/Modal/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { formatPhone } from "@/lib/format";
import {
  UpdateProfileSchema,
  UpdateProfileSchemaType,
} from "@/schemas/UpdateProfileSchema";
import {
  UpdatePasswordSchema,
  UpdatePasswordSchemaType,
} from "@/schemas/UpdatePasswordSchema";
import { updateProfile } from "@/actions/profile/updateProfile";
import { updatePassword } from "@/actions/profile/updatePassword";
import { deleteAccount } from "@/actions/profile/deleteAccount";

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

type Props = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    emailOptIn: boolean;
    memberSinceIso: string;
  };
  circleCount: number;
  adminCircleCount: number;
};

export default function ProfilePage({
  user,
  circleCount,
  adminCircleCount,
}: Props) {
  const router = useRouter();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Pending navigation state.
  // Value is either a URL string (link click) or "__BACK__" (browser back button).
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

  // Ref flag so our popstate handler knows when we're intentionally navigating
  // away (via "Yes, leave") vs. the user pressing back again
  const isLeavingRef = useRef(false);

  // ——— Profile form ———

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    setValue: setProfileValue,
    formState: { errors: profileErrors, isDirty: profileIsDirty },
    reset: resetProfileForm,
  } = useForm<UpdateProfileSchemaType>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: formatPhone(user.phone),
      emailOptIn: user.emailOptIn,
    },
    mode: "onTouched",
  });

  // Keep form defaults in sync with fresh server data after saves
  useEffect(() => {
    resetProfileForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: formatPhone(user.phone),
      emailOptIn: user.emailOptIn,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.firstName, user.lastName, user.email, user.phone, user.emailOptIn]);

  const onProfileSubmit = async (values: UpdateProfileSchemaType) => {
    setSavingProfile(true);
    const result = await updateProfile(values);

    if (result.success) {
      toast.success("Profile updated");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update profile");
    }

    setSavingProfile(false);
  };

  // ——— Unsaved-changes guard ———
  // Three mechanisms:
  //   1. beforeunload — tab close, refresh, external URL (native browser dialog)
  //   2. click on <a> — in-app Link navigation (our custom modal)
  //   3. popstate — browser back/forward button (our custom modal via history trap)

  useEffect(() => {
    if (!profileIsDirty) return;

    // History trap for the back button.
    // Push a duplicate entry at the current URL so "back" pops into it
    // instead of leaving the page. popstate fires, we re-trap, show modal.
    window.history.pushState(null, "", window.location.href);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (!link) return;
      if (link.target === "_blank") return;
      if (link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href) return;
      if (href.startsWith("tel:") || href.startsWith("mailto:")) return;
      if (href.startsWith("#")) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingNavUrl(href);
    };

    const handlePopState = () => {
      // Skip trap when we're intentionally navigating away
      if (isLeavingRef.current) return;

      // User pressed back/forward — re-trap them and prompt
      window.history.pushState(null, "", window.location.href);
      setPendingNavUrl("__BACK__");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [profileIsDirty]);

  const confirmLeaveWithoutSaving = () => {
    if (!pendingNavUrl) return;

    if (pendingNavUrl === "__BACK__") {
      // User pressed browser back. We need to pop past our trap entry AND
      // the real /profile entry to land where they expected to go.
      isLeavingRef.current = true;
      setPendingNavUrl(null);
      window.history.go(-2);
      // Reset the flag after navigation settles
      setTimeout(() => {
        isLeavingRef.current = false;
      }, 150);
    } else {
      // Normal in-app link click — just navigate to the target URL
      const url = pendingNavUrl;
      setPendingNavUrl(null);
      router.push(url);
    }
  };

  const cancelLeave = () => {
    setPendingNavUrl(null);
  };

  // ——— Password form ———

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<UpdatePasswordSchemaType>({
    resolver: zodResolver(UpdatePasswordSchema),
    mode: "onTouched",
  });

  const onPasswordSubmit = async (values: UpdatePasswordSchemaType) => {
    setSavingPassword(true);
    const result = await updatePassword(values);

    if (result.success) {
      toast.success("Password updated");
      resetPasswordForm();
    } else {
      toast.error(result.error || "Failed to update password");
    }

    setSavingPassword(false);
  };

  // ——— Delete account ———

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteAccount({ confirmationText: deleteText });

    if (result.success) {
      toast.success("Your account has been deleted");
      window.location.href = "/login";
    } else {
      toast.error(result.error || "Failed to delete account");
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setDeleteText("");
  };

  const memberSinceLabel = new Date(user.memberSinceIso).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <LayoutWrapper>
          <header className={styles.header}>
            <div>
              <Link href='/dashboard' className={styles.backLink}>
                ← Dashboard
              </Link>
              <h1 className={styles.title}>Your profile</h1>
            </div>
          </header>

          <div className={styles.subtitle}>
            <SectionHeading
              title={`Member since ${memberSinceLabel}`}
              color='black'
              dotColor='purpleDot'
            />
          </div>

          {/* Basic info card */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Basic info</h2>
            </div>
            <p className={styles.listContext}>
              This is what other circle members see.
            </p>

            <form
              onSubmit={handleProfileSubmit(onProfileSubmit)}
              className={styles.form}
            >
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor='firstName'>
                    First name
                  </label>
                  <input
                    id='firstName'
                    type='text'
                    className={`${styles.input} ${profileErrors.firstName ? styles.inputError : ""}`}
                    {...registerProfile("firstName")}
                  />
                  {profileErrors.firstName && (
                    <span className={styles.fieldError}>
                      {profileErrors.firstName.message}
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
                    className={`${styles.input} ${profileErrors.lastName ? styles.inputError : ""}`}
                    {...registerProfile("lastName")}
                  />
                  {profileErrors.lastName && (
                    <span className={styles.fieldError}>
                      {profileErrors.lastName.message}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor='email'>
                  Email address
                </label>
                <input
                  id='email'
                  type='email'
                  className={`${styles.input} ${profileErrors.email ? styles.inputError : ""}`}
                  {...registerProfile("email")}
                />
                {profileErrors.email && (
                  <span className={styles.fieldError}>
                    {profileErrors.email.message}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor='phone'>
                  Phone number
                </label>
                <input
                  id='phone'
                  type='tel'
                  className={`${styles.input} ${profileErrors.phone ? styles.inputError : ""}`}
                  {...registerProfile("phone", {
                    onChange: (e) => {
                      const formatted = formatPhoneInput(e.target.value);
                      setProfileValue("phone", formatted, {
                        shouldValidate: false,
                        shouldDirty: true,
                      });
                    },
                  })}
                />
                {profileErrors.phone && (
                  <span className={styles.fieldError}>
                    {profileErrors.phone.message}
                  </span>
                )}
              </div>

              <div className={styles.checkboxField}>
                <input
                  id='emailOptIn'
                  type='checkbox'
                  className={styles.checkbox}
                  {...registerProfile("emailOptIn")}
                />
                <div>
                  <label htmlFor='emailOptIn' className={styles.checkboxLabel}>
                    Send me email notifications
                  </label>
                  <p className={styles.checkboxHint}>
                    Shift reminders, swap requests, and circle updates. Turn off
                    if you prefer to just use the website directly.
                  </p>
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type='submit'
                  className={styles.primaryBtn}
                  disabled={savingProfile || !profileIsDirty}
                >
                  {savingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>

          {/* Password card */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Password</h2>
            </div>
            <p className={styles.listContext}>
              Change the password you use to sign in.
            </p>

            <form
              onSubmit={handlePasswordSubmit(onPasswordSubmit)}
              className={styles.form}
            >
              <div className={styles.field}>
                <label className={styles.label} htmlFor='currentPassword'>
                  Current password
                </label>
                <input
                  id='currentPassword'
                  type='password'
                  autoComplete='current-password'
                  className={`${styles.input} ${passwordErrors.currentPassword ? styles.inputError : ""}`}
                  {...registerPassword("currentPassword")}
                />
                {passwordErrors.currentPassword && (
                  <span className={styles.fieldError}>
                    {passwordErrors.currentPassword.message}
                  </span>
                )}
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor='newPassword'>
                    New password
                  </label>
                  <input
                    id='newPassword'
                    type='password'
                    autoComplete='new-password'
                    className={`${styles.input} ${passwordErrors.newPassword ? styles.inputError : ""}`}
                    {...registerPassword("newPassword")}
                  />
                  {passwordErrors.newPassword && (
                    <span className={styles.fieldError}>
                      {passwordErrors.newPassword.message}
                    </span>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor='confirmNewPassword'>
                    Confirm new password
                  </label>
                  <input
                    id='confirmNewPassword'
                    type='password'
                    autoComplete='new-password'
                    className={`${styles.input} ${passwordErrors.confirmNewPassword ? styles.inputError : ""}`}
                    {...registerPassword("confirmNewPassword")}
                  />
                  {passwordErrors.confirmNewPassword && (
                    <span className={styles.fieldError}>
                      {passwordErrors.confirmNewPassword.message}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type='submit'
                  className={styles.primaryBtn}
                  disabled={savingPassword}
                >
                  {savingPassword ? "Updating..." : "Update password"}
                </button>
              </div>
            </form>
          </section>

          {/* Your activity — summary */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Your activity</h2>
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{circleCount}</span>
                <span className={styles.statLabel}>
                  {circleCount === 1 ? "Circle" : "Circles"}
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{adminCircleCount}</span>
                <span className={styles.statLabel}>
                  As {adminCircleCount === 1 ? "organizer" : "organizers"}
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{memberSinceLabel}</span>
                <span className={styles.statLabel}>Member since</span>
              </div>
            </div>
          </section>

          {/* Danger zone */}
          <section className={styles.dangerSection}>
            <h2 className={styles.dangerTitle}>Danger zone</h2>
            <p className={styles.dangerText}>
              Deleting your account removes you from all care circles and cannot
              be undone.
              {adminCircleCount > 0 && (
                <>
                  {" "}
                  <strong>
                    You organize {adminCircleCount}{" "}
                    {adminCircleCount === 1 ? "circle" : "circles"}
                  </strong>{" "}
                  — if you delete your account, those circles will be deleted
                  too, along with all their shift history.
                </>
              )}
            </p>
            <button
              type='button'
              className={styles.dangerBtn}
              onClick={() => setShowDeleteModal(true)}
            >
              Delete my account
            </button>
          </section>
        </LayoutWrapper>
      </div>

      {/* Unsaved-changes confirmation modal */}
      <ConfirmDialog
        isOpen={pendingNavUrl !== null}
        onClose={cancelLeave}
        onConfirm={confirmLeaveWithoutSaving}
        title='Leave without saving?'
        message='You have unsaved changes to your profile. If you leave this page, those changes will be lost.'
        confirmText='Yes, leave'
        cancelText='Stay on page'
        variant='default'
      />

      {/* Delete confirmation modal */}
      <Modal isOpen={showDeleteModal} onClose={closeDeleteModal}>
        <div className={styles.modalBody}>
          <h2 className={styles.modalTitle}>Delete your account?</h2>
          <p className={styles.modalText}>
            This removes{" "}
            <strong>
              {user.firstName} {user.lastName}
            </strong>{" "}
            from Friendship Park Helpers completely.
          </p>

          {adminCircleCount > 0 ? (
            <div className={styles.modalWarning}>
              <p className={styles.modalWarningTitle}>
                ⚠️ You organize {adminCircleCount}{" "}
                {adminCircleCount === 1 ? "circle" : "circles"}
              </p>
              <p className={styles.modalWarningText}>
                Deleting your account will also delete{" "}
                {adminCircleCount === 1 ? "that circle" : "those circles"} and
                all shift history. Helpers will lose access. Recipients will
                too.
              </p>
            </div>
          ) : circleCount > 0 ? (
            <div className={styles.modalInfo}>
              <p className={styles.modalInfoText}>
                You&apos;ll be removed from {circleCount}{" "}
                {circleCount === 1 ? "circle" : "circles"} and your future
                shifts will be reassigned to other helpers.
              </p>
            </div>
          ) : null}

          <p className={styles.modalText}>
            To confirm, type <strong>DELETE</strong> below.
          </p>

          <input
            type='text'
            className={styles.modalInput}
            placeholder='Type DELETE to confirm'
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            disabled={deleting}
            autoFocus
          />

          <div className={styles.modalActions}>
            <button
              type='button'
              className={styles.modalCancelBtn}
              onClick={closeDeleteModal}
              disabled={deleting}
            >
              Never mind
            </button>
            <button
              type='button'
              className={styles.modalDeleteBtn}
              onClick={handleDelete}
              disabled={deleting || deleteText !== "DELETE"}
            >
              {deleting ? "Deleting..." : "Delete my account forever"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
