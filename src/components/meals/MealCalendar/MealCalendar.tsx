// components/meals/MealCalendar/MealCalendar.tsx
//
// The heart of a meal train: every scheduled day, who's covering it, and what
// they're bringing. Open days have a "Sign up" button; your own days can be
// edited or released; organizers can release anyone's day.
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./MealCalendar.module.css";
import MealFormModal from "@/components/meals/MealFormModal/MealFormModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { formatShiftDate, formatShiftFullDate } from "@/lib/shifts/formatShift";
import { claimSlot } from "@/actions/meals/claimSlot";
import { releaseSlot } from "@/actions/meals/releaseSlot";
import { updateMeal } from "@/actions/meals/updateMeal";

export type MealSlot = {
  id: string;
  scheduledDate: string; // ISO
  status: string; // SCHEDULED | IN_PROGRESS | COMPLETED
  mealDescription: string | null;
  mealNotes: string | null;
  assignedUser: { id: string; firstName: string; lastName: string } | null;
};

type Props = {
  circleId: string;
  currentUserId: string;
  isAdmin: boolean;
  /** Helpers and organizers can sign up; the recipient can't. */
  canSignUp: boolean;
  recipientFirstName: string | null;
  slots: MealSlot[];
};

type FormState = { mode: "claim" | "edit"; slot: MealSlot } | null;

export default function MealCalendar({
  circleId,
  currentUserId,
  isAdmin,
  canSignUp,
  recipientFirstName,
  slots,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [openOnly, setOpenOnly] = useState(false);
  const [form, setForm] = useState<FormState>(null);
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState<MealSlot | null>(null);
  const [releaseBusy, setReleaseBusy] = useState(false);

  const upcoming = slots.filter((s) => s.status !== "COMPLETED");
  const openCount = upcoming.filter((s) => !s.assignedUser).length;
  const visible = openOnly ? slots.filter((s) => !s.assignedUser) : slots;

  const refresh = () => startTransition(() => router.refresh());

  const handleSubmitMeal = async (meal: {
    mealDescription: string;
    mealNotes: string;
  }) => {
    if (!form) return;
    setSaving(true);

    if (form.mode === "claim") {
      const result = await claimSlot(form.slot.id, meal);
      if (result.success) {
        toast.success("You're signed up — check your email for the details");
      } else {
        toast.error(result.error);
      }
    } else {
      const result = await updateMeal(form.slot.id, meal);
      if (result.success) toast.success("Meal updated");
      else toast.error(result.error ?? "Couldn't save that");
    }

    setSaving(false);
    setForm(null);
    refresh();
  };

  const handleRelease = async () => {
    if (!releasing) return;
    setReleaseBusy(true);

    const result = await releaseSlot(releasing.id);
    if (result.success) toast.success("That day is open again");
    else toast.error(result.error);

    setReleaseBusy(false);
    setReleasing(null);
    refresh();
  };

  if (slots.length === 0) {
    return (
      <p className={styles.empty}>
        No days on the calendar yet. Check the schedule above — days appear here
        as soon as the start date and days of the week are set.
      </p>
    );
  }

  const releasingMine = releasing?.assignedUser?.id === currentUserId;

  return (
    <>
      <div className={styles.toolbar}>
        <p className={styles.summary}>
          {openCount === 0
            ? "Every day is covered."
            : `${openCount} of ${upcoming.length} ${upcoming.length === 1 ? "day" : "days"} still ${openCount === 1 ? "needs" : "need"} someone.`}
        </p>
        {openCount > 0 && openCount < slots.length && (
          <button
            type='button'
            className={styles.filterBtn}
            aria-pressed={openOnly}
            onClick={() => setOpenOnly((v) => !v)}
          >
            {openOnly ? "Show all days" : "Show open days only"}
          </button>
        )}
      </div>

      <ul className={styles.list}>
        {visible.map((slot) => {
          const date = new Date(slot.scheduledDate);
          const isMine = slot.assignedUser?.id === currentUserId;
          const isOpen = !slot.assignedUser;
          const isDone = slot.status === "COMPLETED";
          const detailHref = `/circles/${circleId}/shifts/${slot.id}`;

          return (
            <li
              key={slot.id}
              className={`${styles.row} ${isOpen ? styles.rowOpen : ""} ${isMine ? styles.rowMine : ""} ${isDone ? styles.rowDone : ""}`}
            >
              <div className={styles.date}>
                <p className={styles.dateMain}>{formatShiftDate(date)}</p>
                <p className={styles.dateFull}>{formatShiftFullDate(date)}</p>
              </div>

              <div className={styles.who}>
                {isOpen ? (
                  <p className={styles.openLabel}>Open — needs someone</p>
                ) : (
                  <>
                    <p className={styles.helperName}>
                      {isMine
                        ? "You"
                        : `${slot.assignedUser!.firstName} ${slot.assignedUser!.lastName.charAt(0)}.`}
                      {isDone && (
                        <em className={styles.doneTag}> · Delivered</em>
                      )}
                    </p>
                    <p
                      className={
                        slot.mealDescription ? styles.meal : styles.mealMissing
                      }
                    >
                      {slot.mealDescription ??
                        (isMine
                          ? "You haven't said what you're bringing yet"
                          : "Meal not added yet")}
                    </p>
                    {slot.mealNotes && (
                      <p className={styles.mealNotes}>{slot.mealNotes}</p>
                    )}
                  </>
                )}
              </div>

              <div className={styles.actions}>
                {isOpen && canSignUp && (
                  <button
                    type='button'
                    className={styles.signUpBtn}
                    onClick={() => setForm({ mode: "claim", slot })}
                  >
                    Sign up
                  </button>
                )}

                {isMine && !isDone && (
                  <>
                    <Link href={detailHref} className={styles.linkBtn}>
                      Open
                    </Link>
                    <button
                      type='button'
                      className={styles.linkBtn}
                      onClick={() => setForm({ mode: "edit", slot })}
                    >
                      {slot.mealDescription ? "Edit meal" : "Add meal"}
                    </button>
                    <button
                      type='button'
                      className={styles.releaseBtn}
                      onClick={() => setReleasing(slot)}
                    >
                      Release
                    </button>
                  </>
                )}

                {!isOpen && !isMine && !isDone && isAdmin && (
                  <button
                    type='button'
                    className={styles.releaseBtn}
                    onClick={() => setReleasing(slot)}
                  >
                    Release
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <MealFormModal
        isOpen={!!form}
        mode={form?.mode ?? "claim"}
        dateLabel={
          form ? formatShiftFullDate(new Date(form.slot.scheduledDate)) : ""
        }
        recipientFirstName={recipientFirstName}
        initialMeal={form?.slot.mealDescription}
        initialNotes={form?.slot.mealNotes}
        saving={saving}
        onClose={() => setForm(null)}
        onSubmit={handleSubmitMeal}
      />

      <ConfirmDialog
        isOpen={!!releasing}
        onClose={() => setReleasing(null)}
        onConfirm={handleRelease}
        title={releasingMine ? "Release this day?" : "Take them off this day?"}
        message={
          releasing
            ? releasingMine
              ? `${formatShiftFullDate(new Date(releasing.scheduledDate))} will open up for someone else, and the organizer will be told.`
              : `${releasing.assignedUser?.firstName ?? "They"} will be emailed that they're no longer bringing a meal on ${formatShiftFullDate(new Date(releasing.scheduledDate))}, and the day will open up again.`
            : ""
        }
        confirmText='Yes, release it'
        confirming={releaseBusy}
        icon='🍽️'
      />
    </>
  );
}
