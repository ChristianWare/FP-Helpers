// components/meals/MealDetailsSection/MealDetailsSection.tsx
//
// Who people are cooking for: household size, allergies, preferences.
// Shown on the circle page (organizers can edit) and on the recipient's own
// page (they can edit too — nobody knows their allergies better).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./MealDetailsSection.module.css";
import { updateMealDetails } from "@/actions/circles/updateMealDetails";

type Details = {
  mealHouseholdSize: string | null;
  mealAllergies: string | null;
  mealPreferences: string | null;
};

type Props = {
  circleId: string;
  details: Details;
  canEdit: boolean;
  /** "you" on the recipient's page, their first name everywhere else. */
  audience: "recipient" | "helpers";
  recipientFirstName: string | null;
};

export default function MealDetailsSection({
  circleId,
  details,
  canEdit,
  audience,
  recipientFirstName,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [householdSize, setHouseholdSize] = useState("");
  const [allergies, setAllergies] = useState("");
  const [preferences, setPreferences] = useState("");

  const isEmpty =
    !details.mealHouseholdSize &&
    !details.mealAllergies &&
    !details.mealPreferences;

  const title =
    audience === "recipient"
      ? "About your household"
      : `Cooking for ${recipientFirstName ?? "them"}`;

  const startEditing = () => {
    setHouseholdSize(details.mealHouseholdSize ?? "");
    setAllergies(details.mealAllergies ?? "");
    setPreferences(details.mealPreferences ?? "");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const result = await updateMealDetails(circleId, {
      mealHouseholdSize: householdSize,
      mealAllergies: allergies,
      mealPreferences: preferences,
    });

    if (result.success) {
      toast.success("Details saved");
      setEditing(false);
      router.refresh();
    } else {
      toast.error(result.error ?? "Couldn't save that");
    }
    setSaving(false);
  };

  // Nothing to show and no way to add it — skip the section entirely.
  if (isEmpty && !canEdit) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {canEdit && !editing && (
          <button
            type='button'
            className={styles.editBtn}
            onClick={startEditing}
          >
            {isEmpty ? "Add" : "Edit"}
          </button>
        )}
      </div>

      {editing ? (
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor='mealHouseholdSize'>
              How many people are eating?
            </label>
            <input
              id='mealHouseholdSize'
              type='text'
              className={styles.input}
              placeholder='2 adults, 3 kids'
              value={householdSize}
              onChange={(e) => setHouseholdSize(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor='mealAllergies'>
              Allergies and foods to avoid
            </label>
            <textarea
              id='mealAllergies'
              className={styles.textarea}
              rows={2}
              placeholder='Tree nut allergy. No shellfish.'
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor='mealPreferences'>
              Anything else cooks should know?
            </label>
            <textarea
              id='mealPreferences'
              className={styles.textarea}
              rows={3}
              placeholder='The kids love pasta. Not big on spicy food. Disposable containers are easiest.'
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className={styles.formActions}>
            <button
              type='button'
              className={styles.cancelBtn}
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type='button'
              className={styles.primaryBtn}
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save details"}
            </button>
          </div>
        </div>
      ) : isEmpty ? (
        <p className={styles.emptyText}>
          {audience === "recipient"
            ? "Tell everyone how many people they're cooking for, and about any allergies or foods you'd rather skip."
            : "Nothing here yet. Add household size and allergies so people know what to cook — it's the first thing they'll ask."}
        </p>
      ) : (
        <div className={styles.infoCard}>
          {details.mealAllergies && (
            <div className={styles.allergyRow}>
              <p className={styles.allergyLabel}>
                Allergies and foods to avoid
              </p>
              <p className={styles.allergyValue}>{details.mealAllergies}</p>
            </div>
          )}
          {details.mealHouseholdSize && (
            <div className={styles.infoRow}>
              <p className={styles.fieldLabel}>Cooking for</p>
              <p className={styles.infoValue}>{details.mealHouseholdSize}</p>
            </div>
          )}
          {details.mealPreferences && (
            <div className={styles.infoRow}>
              <p className={styles.fieldLabel}>Good to know</p>
              <p className={styles.infoValueNotes}>{details.mealPreferences}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
