// app/(protected)/circles/[id]/shifts/[shiftId]/MealShiftPage.tsx
//
// One day of a meal train. Replaces the grocery-run shift page for
// MEAL_TRAIN circles: the meal, who it's for, and where it goes.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import base from "./ShiftDetailPage.module.css";
import styles from "./MealShiftPage.module.css";
import { formatPhone } from "@/lib/format";
import { formatShiftFullDate } from "@/lib/shifts/formatShift";
import { claimSlot } from "@/actions/meals/claimSlot";
import { releaseSlot } from "@/actions/meals/releaseSlot";
import { updateMeal } from "@/actions/meals/updateMeal";
import { markShiftComplete } from "@/actions/shifts/markShiftComplete";
import { sendTestReminder } from "@/actions/shifts/sendTestReminder";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";

function labelForTemplate(template: string): string {
  if (template === "shift_reminder_t7") return "7-day reminder";
  if (template === "shift_reminder_t2") return "2-day reminder";
  if (template === "shift_reminder_t1") return "Day-before reminder";
  return template;
}

type NotificationEntry = {
  id: string;
  template: string;
  channel: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  error: string | null;
};

type Props = {
  currentUserName: string;
  currentUserEmail: string;
  isAssignedHelper: boolean;
  isAdmin: boolean;
  canSignUp: boolean;
  shift: {
    id: string;
    scheduledDate: string;
    status: string;
    completedAt: string | null;
    mealDescription: string | null;
    mealNotes: string | null;
    assignedUser: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
    } | null;
  };
  circle: {
    id: string;
    name: string;
    addressLine1: string | null;
    addressLine2: string | null;
    accessNotes: string | null;
    typicalArrivalTime: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    mealHouseholdSize: string | null;
    mealAllergies: string | null;
    mealPreferences: string | null;
  };
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  notifications: NotificationEntry[];
  reminderSummary: string;
  reminderDays: (7 | 2 | 1)[];
};

export default function MealShiftPage({
  currentUserName,
  currentUserEmail,
  isAssignedHelper,
  isAdmin,
  canSignUp,
  shift,
  circle,
  recipient,
  notifications,
  reminderSummary,
  reminderDays,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [editingMeal, setEditingMeal] = useState(false);
  const [mealDescription, setMealDescription] = useState("");
  const [mealNotes, setMealNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showRelease, setShowRelease] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [showDelivered, setShowDelivered] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const isComplete = shift.status === "COMPLETED";
  const isOpen = !shift.assignedUser;
  const canEditMeal = (isAssignedHelper || isAdmin) && !isOpen && !isComplete;
  const canRelease = (isAssignedHelper || isAdmin) && !isOpen && !isComplete;
  const dateLabel = formatShiftFullDate(new Date(shift.scheduledDate));
  const who = recipient?.firstName ?? "them";

  const oneLineAddress = [circle.addressLine1, circle.addressLine2]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = oneLineAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(oneLineAddress)}`
    : null;

  const hasHousehold =
    circle.mealHouseholdSize || circle.mealAllergies || circle.mealPreferences;

  const refresh = () => startTransition(() => router.refresh());

  const startEditingMeal = () => {
    setMealDescription(shift.mealDescription ?? "");
    setMealNotes(shift.mealNotes ?? "");
    setEditingMeal(true);
  };

  const handleClaim = async () => {
    setSaving(true);
    const result = await claimSlot(shift.id, { mealDescription, mealNotes });
    if (result.success) {
      toast.success("You're signed up — check your email for the details");
    } else {
      toast.error(result.error);
    }
    setSaving(false);
    refresh();
  };

  const handleSaveMeal = async () => {
    setSaving(true);
    const result = await updateMeal(shift.id, { mealDescription, mealNotes });
    if (result.success) {
      toast.success("Meal updated");
      setEditingMeal(false);
      refresh();
    } else {
      toast.error(result.error ?? "Couldn't save that");
    }
    setSaving(false);
  };

  const handleRelease = async () => {
    setReleasing(true);
    const result = await releaseSlot(shift.id);
    if (result.success) {
      toast.success("That day is open again");
      router.push(`/circles/${circle.id}`);
      router.refresh();
      return;
    }
    toast.error(result.error);
    setReleasing(false);
    setShowRelease(false);
  };

  const handleDelivered = async () => {
    setCompleting(true);
    const result = await markShiftComplete(shift.id);
    if (result.success) {
      toast.success("Marked as delivered — thank you!");
      setShowDelivered(false);
      refresh();
    } else if (result.error) {
      toast.error(result.error);
    }
    setCompleting(false);
  };

  const handleSendTestReminder = async (daysBefore: 7 | 2 | 1) => {
    setSendingTest(true);
    const result = await sendTestReminder({ shiftId: shift.id, daysBefore });
    if (result.success) {
      toast.success("Test reminder sent — check your inbox");
      refresh();
    } else if (result.error) {
      toast.error(result.error);
    }
    setSendingTest(false);
  };

  const mealFields = (
    <>
      <div className={styles.field}>
        <label className={styles.label} htmlFor='mealDescription'>
          What are you bringing?
        </label>
        <input
          id='mealDescription'
          type='text'
          className={styles.input}
          placeholder='Chicken enchiladas and rice'
          value={mealDescription}
          onChange={(e) => setMealDescription(e.target.value)}
          maxLength={120}
        />
        <p className={styles.hint}>
          Not sure yet? Leave it blank and add it later. Everyone can see this,
          so it helps avoid doubling up.
        </p>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor='mealNotes'>
          Anything they should know? (optional)
        </label>
        <textarea
          id='mealNotes'
          className={styles.textarea}
          rows={3}
          placeholder='Contains dairy. Reheat at 350° for 20 minutes.'
          value={mealNotes}
          onChange={(e) => setMealNotes(e.target.value)}
          maxLength={500}
        />
      </div>
    </>
  );

  return (
    <section className={base.container}>
      <div className={base.content}>
        <LayoutWrapper>
          <header className={base.header}>
            <div>
              <Link href={`/circles/${circle.id}`} className={base.backLink}>
                ← {circle.name}
              </Link>
              <h1 className={base.title}>Hi {currentUserName}</h1>
            </div>
            <div className={base.accountInfo}>
              <button
                type='button'
                className={base.signOutBtn}
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign out
              </button>
              <p className={base.userEmail}>{currentUserEmail}</p>
            </div>
          </header>

          <div className={base.subtitle}>
            <SectionHeading
              title={`A meal${recipient ? ` for ${recipient.firstName} ${recipient.lastName}` : ""}`}
              color='black'
              dotColor='purpleDot'
            />
          </div>

          {/* Banner */}
          <section className={base.shiftBanner}>
            <h2 className={base.shiftBannerTitle}>
              {isComplete
                ? "Meal delivered"
                : isOpen
                  ? "This day is open"
                  : isAssignedHelper
                    ? "You're bringing a meal"
                    : `${shift.assignedUser?.firstName ?? "Someone"} is bringing a meal`}
            </h2>
            <p className={base.shiftBannerDate}>
              {dateLabel}
              {circle.typicalArrivalTime &&
                ` · drop off around ${circle.typicalArrivalTime}`}
            </p>
            {recipient && !isOpen && (
              <a
                href={`tel:${recipient.phone}`}
                className={base.shiftBannerPhone}
              >
                Call {recipient.firstName}: {formatPhone(recipient.phone)}
              </a>
            )}
          </section>

          {/* Open day → sign up right here */}
          {isOpen && !isComplete && (
            <section className={base.section}>
              <div className={base.sectionHeader}>
                <h2 className={base.sectionTitle}>Sign up for this day</h2>
              </div>
              {canSignUp ? (
                <div className={styles.form}>
                  {mealFields}
                  <button
                    type='button'
                    className={base.completeBtn}
                    onClick={handleClaim}
                    disabled={saving}
                  >
                    {saving ? "Signing you up..." : `Sign up for ${dateLabel}`}
                  </button>
                </div>
              ) : (
                <p className={base.emptyText}>
                  Nobody has signed up to bring a meal on this day yet.
                </p>
              )}
            </section>
          )}

          {/* The meal */}
          {!isOpen && (
            <section className={base.section}>
              <div className={base.sectionHeader}>
                <h2 className={base.sectionTitle}>
                  {isAssignedHelper ? "Your meal" : "The meal"}
                </h2>
                {canEditMeal && !editingMeal && (
                  <button
                    type='button'
                    className={styles.editBtn}
                    onClick={startEditingMeal}
                  >
                    {shift.mealDescription ? "Edit" : "Add"}
                  </button>
                )}
              </div>

              {editingMeal ? (
                <div className={styles.form}>
                  {mealFields}
                  <div className={styles.formActions}>
                    <button
                      type='button'
                      className={styles.cancelBtn}
                      onClick={() => setEditingMeal(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      className={styles.primaryBtn}
                      onClick={handleSaveMeal}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save meal"}
                    </button>
                  </div>
                </div>
              ) : shift.mealDescription ? (
                <div className={styles.mealCard}>
                  <p className={styles.mealName}>{shift.mealDescription}</p>
                  {shift.mealNotes && (
                    <p className={styles.mealNotes}>{shift.mealNotes}</p>
                  )}
                </div>
              ) : (
                <p className={base.emptyText}>
                  {isAssignedHelper
                    ? "You haven't said what you're bringing yet. Adding it helps everyone else avoid doubling up."
                    : `${shift.assignedUser?.firstName ?? "They"} hasn't said what they're bringing yet.`}
                </p>
              )}

              {isAssignedHelper && !isComplete && !editingMeal && (
                <button
                  type='button'
                  className={base.completeBtn}
                  onClick={() => setShowDelivered(true)}
                  disabled={completing}
                >
                  Mark as delivered
                </button>
              )}

              {canRelease && !editingMeal && (
                <button
                  type='button'
                  className={base.swapRequestBtn}
                  onClick={() => setShowRelease(true)}
                >
                  {isAssignedHelper
                    ? "Can't make it? Release this day"
                    : `Take ${shift.assignedUser?.firstName ?? "them"} off this day`}
                </button>
              )}

              {isComplete && shift.completedAt && (
                <p className={base.completedNote}>
                  Delivered on{" "}
                  {formatShiftFullDate(new Date(shift.completedAt))}.
                </p>
              )}
            </section>
          )}

          {/* Who they're cooking for */}
          {hasHousehold && (
            <section className={base.section}>
              <div className={base.sectionHeader}>
                <h2 className={base.sectionTitle}>Cooking for {who}</h2>
              </div>
              {circle.mealAllergies && (
                <div className={styles.allergyBlock}>
                  <p className={styles.allergyLabel}>
                    Allergies and foods to avoid
                  </p>
                  <p className={styles.allergyText}>{circle.mealAllergies}</p>
                </div>
              )}
              {circle.mealHouseholdSize && (
                <div className={base.notesBlock}>
                  <p className={base.notesLabel}>How many</p>
                  <p className={base.notesText}>{circle.mealHouseholdSize}</p>
                </div>
              )}
              {circle.mealPreferences && (
                <div className={base.notesBlock}>
                  <p className={base.notesLabel}>Good to know</p>
                  <p className={`${base.notesText} ${styles.preLine}`}>
                    {circle.mealPreferences}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Address + access info */}
          {(oneLineAddress || circle.accessNotes) && (
            <section className={base.section}>
              <div className={base.sectionHeader}>
                <h2 className={base.sectionTitle}>Where to drop off</h2>
              </div>
              {oneLineAddress && (
                <div className={base.addressBlock}>
                  <p className={base.addressText}>
                    {circle.addressLine1}
                    {circle.addressLine1 && circle.addressLine2 && <br />}
                    {circle.addressLine2}
                  </p>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={base.mapsLink}
                    >
                      Open in Maps →
                    </a>
                  )}
                </div>
              )}
              {circle.accessNotes && (
                <div className={base.notesBlock}>
                  <p className={base.notesLabel}>Notes</p>
                  <p className={base.notesText}>{circle.accessNotes}</p>
                </div>
              )}
            </section>
          )}

          {/* Reminders — only shown to the person bringing the meal */}
          {isAssignedHelper && (
            <section className={base.section}>
              <div className={base.sectionHeader}>
                <h2 className={base.sectionTitle}>Reminders</h2>
              </div>

              {notifications.length === 0 ? (
                <p className={base.emptyText}>
                  No reminders sent yet. You&apos;ll get{" "}
                  {reminderDays.length === 1 ? "an email" : "emails"}{" "}
                  {reminderSummary} before your day.
                </p>
              ) : (
                <div className={base.notificationList}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`${base.notificationRow} ${n.status === "FAILED" ? base.notificationRowFailed : ""}`}
                    >
                      <span className={base.notificationIcon}>
                        {n.status === "FAILED" ? "⚠️" : "📧"}
                      </span>
                      <div className={base.notificationBody}>
                        <p className={base.notificationLabel}>
                          {labelForTemplate(n.template)}
                        </p>
                        <p className={base.notificationMeta}>
                          {n.status === "SENT" && n.sentAt
                            ? `Sent ${new Date(n.sentAt).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                },
                              )}`
                            : n.status === "FAILED"
                              ? `Failed — ${n.error ?? "unknown error"}`
                              : n.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isComplete && reminderDays.length > 0 && (
                <div className={base.testReminderBlock}>
                  <p className={base.testReminderLabel}>
                    Want to see what the email looks like?
                  </p>
                  <div className={base.testReminderButtons}>
                    {reminderDays.map((days) => (
                      <button
                        key={days}
                        type='button'
                        className={base.testReminderBtn}
                        onClick={() => handleSendTestReminder(days)}
                        disabled={sendingTest}
                      >
                        {days}-day version
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Emergency contact */}
          {(circle.emergencyContact || circle.emergencyPhone) && (
            <section className={base.section}>
              <div className={base.sectionHeader}>
                <h2 className={base.sectionTitle}>In case of emergency</h2>
              </div>
              <div className={base.emergencyBlock}>
                {circle.emergencyContact && (
                  <p className={base.emergencyName}>
                    {circle.emergencyContact}
                  </p>
                )}
                {circle.emergencyPhone && (
                  <a
                    href={`tel:${circle.emergencyPhone}`}
                    className={base.emergencyPhone}
                  >
                    {formatPhone(circle.emergencyPhone)}
                  </a>
                )}
              </div>
            </section>
          )}
        </LayoutWrapper>
      </div>

      <ConfirmDialog
        isOpen={showDelivered}
        onClose={() => setShowDelivered(false)}
        onConfirm={handleDelivered}
        title='Mark as delivered?'
        message={`This closes out ${dateLabel}. Thank you for feeding ${who}!`}
        confirmText='Yes, delivered'
        variant='default'
        icon='🍽️'
        confirming={completing}
      />

      <ConfirmDialog
        isOpen={showRelease}
        onClose={() => setShowRelease(false)}
        onConfirm={handleRelease}
        title={
          isAssignedHelper ? "Release this day?" : "Take them off this day?"
        }
        message={
          isAssignedHelper
            ? `${dateLabel} will open up for someone else, and the organizer will be told. The sooner you release it, the easier it is to fill.`
            : `${shift.assignedUser?.firstName ?? "They"} will be emailed that they're no longer bringing a meal on ${dateLabel}, and the day will open up again.`
        }
        confirmText='Yes, release it'
        confirming={releasing}
      />
    </section>
  );
}
