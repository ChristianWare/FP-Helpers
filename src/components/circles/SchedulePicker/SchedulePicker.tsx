// components/circles/SchedulePicker/SchedulePicker.tsx
//
// "How often?" — every day, one day a week, or several days a week.
// Shared by the create-circle wizard and the schedule editor on the circle
// page. Fully controlled: the parent owns the values (react-hook-form in both
// cases) and this component only reports changes.
"use client";

import styles from "./SchedulePicker.module.css";
import {
  DAY_NAMES,
  DAY_NAMES_SHORT,
  normalizeDays,
  type ScheduleFrequency,
} from "@/lib/shifts/scheduleDates";

type CadenceValue = "WEEKLY" | "BIWEEKLY";

type Props = {
  /** Unique prefix so two pickers can never share element ids. */
  idPrefix: string;
  frequency: ScheduleFrequency;
  singleDay: number;
  multipleDays: number[];
  cadence: CadenceValue;
  onFrequencyChange: (value: ScheduleFrequency) => void;
  onSingleDayChange: (value: number) => void;
  onMultipleDaysChange: (value: number[]) => void;
  onCadenceChange: (value: CadenceValue) => void;
  /** Validation message for the day chips ("Pick at least two days…"). */
  daysError?: string;
  /** Validation message for the schedule as a whole. */
  scheduleError?: string;
  /**
   * "caps" matches the small uppercase labels of the circle page's edit
   * forms; the default matches the create-circle wizard.
   */
  labelStyle?: "default" | "caps";
};

const FREQUENCY_OPTIONS: {
  value: ScheduleFrequency;
  title: string;
  example: string;
}[] = [
  { value: "DAILY", title: "Every day", example: "All seven days" },
  { value: "ONE_DAY", title: "One day a week", example: "e.g. Saturdays" },
  {
    value: "MULTIPLE_DAYS",
    title: "Several days a week",
    example: "e.g. Wed and Sat",
  },
];

const WEEKDAYS = [1, 2, 3, 4, 5];

export default function SchedulePicker({
  idPrefix,
  frequency,
  singleDay,
  multipleDays,
  cadence,
  onFrequencyChange,
  onSingleDayChange,
  onMultipleDaysChange,
  onCadenceChange,
  daysError,
  scheduleError,
  labelStyle = "default",
}: Props) {
  const selected = new Set(normalizeDays(multipleDays));

  const toggleDay = (day: number) => {
    const next = new Set(selected);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onMultipleDaysChange(normalizeDays(Array.from(next)));
  };

  const weekdaysSelected =
    selected.size === WEEKDAYS.length && WEEKDAYS.every((d) => selected.has(d));

  return (
    <div
      className={`${styles.picker} ${labelStyle === "caps" ? styles.capsLabels : ""}`}
    >
      {/* ——— Every day / one day / several days ——— */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>How often</legend>
        <div className={styles.options}>
          {FREQUENCY_OPTIONS.map((option) => {
            const active = frequency === option.value;
            return (
              <label
                key={option.value}
                className={`${styles.option} ${active ? styles.optionActive : ""}`}
              >
                <input
                  type='radio'
                  name={`${idPrefix}-frequency`}
                  value={option.value}
                  checked={active}
                  onChange={() => onFrequencyChange(option.value)}
                  className={styles.optionInput}
                />
                <p className={styles.optionTitle}>{option.title}</p>
                <p className={styles.optionExample}>{option.example}</p>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ——— One day: which one ——— */}
      {frequency === "ONE_DAY" && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-day`}>
            Day of the week
          </label>
          <select
            id={`${idPrefix}-day`}
            className={styles.select}
            value={singleDay}
            onChange={(e) => onSingleDayChange(Number(e.target.value))}
          >
            {DAY_NAMES.map((name, value) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ——— Several days: tap to toggle ——— */}
      {frequency === "MULTIPLE_DAYS" && (
        <div className={styles.field}>
          <p className={styles.label} id={`${idPrefix}-days-label`}>
            Which days?
          </p>
          <div
            className={styles.chips}
            role='group'
            aria-labelledby={`${idPrefix}-days-label`}
          >
            {DAY_NAMES_SHORT.map((short, day) => {
              const on = selected.has(day);
              return (
                <button
                  key={day}
                  type='button'
                  className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                  aria-pressed={on}
                  aria-label={DAY_NAMES[day]}
                  onClick={() => toggleDay(day)}
                >
                  {short}
                </button>
              );
            })}
          </div>
          {!weekdaysSelected && (
            <button
              type='button'
              className={styles.preset}
              onClick={() => onMultipleDaysChange([...WEEKDAYS])}
            >
              Use weekdays (Mon–Fri)
            </button>
          )}
          {daysError && <p className={styles.error}>{daysError}</p>}
        </div>
      )}

      {/* ——— Every week / every other week (meaningless for "every day") ——— */}
      {frequency !== "DAILY" && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-cadence`}>
            Every week, or every other?
          </label>
          <select
            id={`${idPrefix}-cadence`}
            className={styles.select}
            value={cadence}
            onChange={(e) => onCadenceChange(e.target.value as CadenceValue)}
          >
            <option value='WEEKLY'>Every week</option>
            <option value='BIWEEKLY'>Every other week</option>
          </select>
        </div>
      )}

      {scheduleError && <p className={styles.error}>{scheduleError}</p>}
    </div>
  );
}
