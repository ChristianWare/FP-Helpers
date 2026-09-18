// components/meals/MealFormModal/MealFormModal.tsx
//
// "What are you bringing?" — used when signing up for a day and when editing
// a meal later. Both fields are optional on purpose: people commit to a date
// before they know what they're cooking, and can fill it in any time.
"use client";

import { useEffect, useState } from "react";
import styles from "./MealFormModal.module.css";

type Props = {
  isOpen: boolean;
  mode: "claim" | "edit";
  dateLabel: string; // "Tuesday, October 6"
  recipientFirstName: string | null;
  initialMeal?: string | null;
  initialNotes?: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (meal: { mealDescription: string; mealNotes: string }) => void;
};

export default function MealFormModal(props: Props) {
  // Mounting only while open means the inputs always start from the latest
  // initial values — no effect needed to reset them between days.
  if (!props.isOpen) return null;
  return <MealFormDialog {...props} />;
}

function MealFormDialog({
  mode,
  dateLabel,
  recipientFirstName,
  initialMeal,
  initialNotes,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [mealDescription, setMealDescription] = useState(initialMeal ?? "");
  const [mealNotes, setMealNotes] = useState(initialNotes ?? "");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  const isClaim = mode === "claim";
  const who = recipientFirstName ?? "them";

  return (
    <div
      className={styles.overlay}
      onClick={() => !saving && onClose()}
      role='dialog'
      aria-modal='true'
      aria-labelledby='meal-form-title'
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title} id='meal-form-title'>
          {isClaim ? "Sign up for this day" : "Update your meal"}
        </h2>
        <p className={styles.subtitle}>
          {isClaim ? (
            <>
              You&apos;ll bring a meal to {who} on <strong>{dateLabel}</strong>.
            </>
          ) : (
            <>
              Your meal for {who} on <strong>{dateLabel}</strong>.
            </>
          )}
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor='meal-description'>
            What are you bringing?
          </label>
          <input
            id='meal-description'
            type='text'
            className={styles.input}
            placeholder='Chicken enchiladas and rice'
            value={mealDescription}
            onChange={(e) => setMealDescription(e.target.value)}
            maxLength={120}
            autoFocus
          />
          <p className={styles.hint}>
            Not sure yet? Leave it blank and add it later. Everyone can see
            this, so it helps avoid four lasagnas in a row.
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor='meal-notes'>
            Anything they should know? (optional)
          </label>
          <textarea
            id='meal-notes'
            className={styles.textarea}
            placeholder='Contains dairy. Reheat at 350° for 20 minutes.'
            value={mealNotes}
            onChange={(e) => setMealNotes(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>

        <div className={styles.actions}>
          <button
            type='button'
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type='button'
            className={styles.submitBtn}
            onClick={() => onSubmit({ mealDescription, mealNotes })}
            disabled={saving}
          >
            {saving ? "Saving..." : isClaim ? "Sign up" : "Save meal"}
          </button>
        </div>
      </div>
    </div>
  );
}
