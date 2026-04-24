/* eslint-disable react-hooks/incompatible-library */
// app/(protected)/circles/[id]/ScheduleSection.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import styles from "./ScheduleSection.module.css";
import { US_STATES } from "@/lib/states";
import { formatCircleAddress } from "@/lib/circles/formatAddress";
import {
  UpdateCircleScheduleSchema,
  UpdateCircleScheduleSchemaType,
} from "@/schemas/UpdateCircleScheduleSchema";
import { updateCircleSchedule } from "@/actions/circles/updateCircleSchedule";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const ARRIVAL_TIMES = (() => {
  const times: { value: string; label: string }[] = [];
  for (let hour = 7; hour <= 21; hour++) {
    for (const min of [0, 30]) {
      const period = hour < 12 ? "am" : "pm";
      const displayHour = hour === 12 ? 12 : hour > 12 ? hour - 12 : hour;
      const minStr = min === 0 ? "00" : "30";
      const label = `${displayHour}:${minStr} ${period}`;
      times.push({ value: label, label });
    }
  }
  return times;
})();

function formatZip(value: string): string {
  return value.replace(/\D/g, "").slice(0, 5);
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.split("T")[0];
}

type Schedule = {
  rotationDayOfWeek: number;
  rotationCadence: string;
  typicalArrivalTime: string | null;
  address: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  accessNotes: string | null;
  durationType: string;
  startDate: string | null;
  endDate: string | null;
};

type Props = {
  circleId: string;
  schedule: Schedule;
  isAdmin: boolean;
};

export default function ScheduleSection({
  circleId,
  schedule,
  isAdmin,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<UpdateCircleScheduleSchemaType>({
    resolver: zodResolver(UpdateCircleScheduleSchema),
    defaultValues: {
      rotationDayOfWeek: schedule.rotationDayOfWeek,
      rotationCadence:
        (schedule.rotationCadence as "WEEKLY" | "BIWEEKLY") ?? "WEEKLY",
      typicalArrivalTime: schedule.typicalArrivalTime ?? "",
      address: schedule.address ?? "",
      addressCity: schedule.addressCity ?? "",
      addressState: schedule.addressState ?? "",
      addressZip: schedule.addressZip ?? "",
      accessNotes: schedule.accessNotes ?? "",
      durationType:
        (schedule.durationType as "INDEFINITE" | "FIXED") ?? "INDEFINITE",
      startDate: isoToDateInput(schedule.startDate),
      endDate: isoToDateInput(schedule.endDate),
    },
    mode: "onTouched",
  });

  const watchedDuration = watch("durationType");

  useEffect(() => {
    reset({
      rotationDayOfWeek: schedule.rotationDayOfWeek,
      rotationCadence:
        (schedule.rotationCadence as "WEEKLY" | "BIWEEKLY") ?? "WEEKLY",
      typicalArrivalTime: schedule.typicalArrivalTime ?? "",
      address: schedule.address ?? "",
      addressCity: schedule.addressCity ?? "",
      addressState: schedule.addressState ?? "",
      addressZip: schedule.addressZip ?? "",
      accessNotes: schedule.accessNotes ?? "",
      durationType:
        (schedule.durationType as "INDEFINITE" | "FIXED") ?? "INDEFINITE",
      startDate: isoToDateInput(schedule.startDate),
      endDate: isoToDateInput(schedule.endDate),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    schedule.rotationDayOfWeek,
    schedule.rotationCadence,
    schedule.typicalArrivalTime,
    schedule.address,
    schedule.addressCity,
    schedule.addressState,
    schedule.addressZip,
    schedule.accessNotes,
    schedule.durationType,
    schedule.startDate,
    schedule.endDate,
  ]);

  const onSubmit = async (values: UpdateCircleScheduleSchemaType) => {
    setSaving(true);
    const result = await updateCircleSchedule(circleId, values);

    if (result.success) {
      toast.success("Schedule updated");
      setEditing(false);
    } else {
      toast.error(result.error || "Failed to update");
    }

    setSaving(false);
  };

  const cancelEdit = () => {
    reset();
    setEditing(false);
  };

  const todayIso = new Date().toISOString().split("T")[0];

  // ——— Display formatting ———

  const dayLabel = DAYS_OF_WEEK[schedule.rotationDayOfWeek]?.label ?? "Not set";
  const cadenceLabel =
    schedule.rotationCadence === "BIWEEKLY" ? "Every other week" : "Every week";

  const { line1: addrLine1, line2: addrLine2 } = formatCircleAddress({
    address: schedule.address,
    addressCity: schedule.addressCity,
    addressState: schedule.addressState,
    addressZip: schedule.addressZip,
  });

  const durationDisplay = (() => {
    if (schedule.durationType === "INDEFINITE") return "Ongoing";
    if (!schedule.endDate) return "Set period (no end date)";
    const end = new Date(schedule.endDate);
    return end.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  })();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Schedule</h2>
        {isAdmin && !editing && (
          <button
            type='button'
            className={styles.editBtn}
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Day + cadence */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor='editDay'>
                Day of the week
              </label>
              <select
                id='editDay'
                className={`${styles.input} ${errors.rotationDayOfWeek ? styles.inputError : ""}`}
                {...register("rotationDayOfWeek", { valueAsNumber: true })}
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              {errors.rotationDayOfWeek && (
                <span className={styles.fieldError}>
                  {errors.rotationDayOfWeek.message}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor='editCadence'>
                How often
              </label>
              <select
                id='editCadence'
                className={`${styles.input} ${errors.rotationCadence ? styles.inputError : ""}`}
                {...register("rotationCadence")}
              >
                <option value='WEEKLY'>Every week</option>
                <option value='BIWEEKLY'>Every other week</option>
              </select>
              {errors.rotationCadence && (
                <span className={styles.fieldError}>
                  {errors.rotationCadence.message}
                </span>
              )}
            </div>
          </div>

          {/* Arrival time */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor='editArrival'>
              Typical arrival time
            </label>
            <select
              id='editArrival'
              className={`${styles.input} ${errors.typicalArrivalTime ? styles.inputError : ""}`}
              {...register("typicalArrivalTime")}
            >
              <option value=''>Not sure yet</option>
              {ARRIVAL_TIMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.typicalArrivalTime && (
              <span className={styles.fieldError}>
                {errors.typicalArrivalTime.message}
              </span>
            )}
          </div>

          {/* Address */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor='editAddress'>
              Street address
            </label>
            <input
              id='editAddress'
              type='text'
              className={`${styles.input} ${errors.address ? styles.inputError : ""}`}
              placeholder='123 Main Street'
              {...register("address")}
            />
            {errors.address && (
              <span className={styles.fieldError}>
                {errors.address.message}
              </span>
            )}
          </div>

          <div className={styles.rowThree}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor='editCity'>
                City
              </label>
              <input
                id='editCity'
                type='text'
                className={`${styles.input} ${errors.addressCity ? styles.inputError : ""}`}
                placeholder='Phoenix'
                {...register("addressCity")}
              />
              {errors.addressCity && (
                <span className={styles.fieldError}>
                  {errors.addressCity.message}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor='editState'>
                State
              </label>
              <select
                id='editState'
                className={`${styles.input} ${errors.addressState ? styles.inputError : ""}`}
                {...register("addressState")}
              >
                <option value=''>—</option>
                {US_STATES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.value}
                  </option>
                ))}
              </select>
              {errors.addressState && (
                <span className={styles.fieldError}>
                  {errors.addressState.message}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor='editZip'>
                ZIP
              </label>
              <input
                id='editZip'
                type='text'
                inputMode='numeric'
                className={`${styles.input} ${errors.addressZip ? styles.inputError : ""}`}
                placeholder='85001'
                {...register("addressZip", {
                  onChange: (e) => {
                    const formatted = formatZip(e.target.value);
                    setValue("addressZip", formatted, {
                      shouldValidate: false,
                      shouldDirty: true,
                    });
                  },
                })}
              />
              {errors.addressZip && (
                <span className={styles.fieldError}>
                  {errors.addressZip.message}
                </span>
              )}
            </div>
          </div>

          {/* Access notes */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor='editNotes'>
              Anything helpers should know?
            </label>
            <textarea
              id='editNotes'
              rows={3}
              className={`${styles.textarea} ${errors.accessNotes ? styles.inputError : ""}`}
              placeholder='Ring the doorbell twice. Dog is friendly.'
              {...register("accessNotes")}
            />
            {errors.accessNotes && (
              <span className={styles.fieldError}>
                {errors.accessNotes.message}
              </span>
            )}
          </div>

          {/* Duration */}
          <div className={styles.field}>
            <span className={styles.label}>Duration</span>
            <div className={styles.radioGroup}>
              <label
                className={`${styles.radioOption} ${watchedDuration === "INDEFINITE" ? styles.radioOptionActive : ""}`}
              >
                <input
                  type='radio'
                  value='INDEFINITE'
                  className={styles.radioInput}
                  {...register("durationType")}
                />
                <div>
                  <p className={styles.radioTitle}>Ongoing</p>
                  <p className={styles.radioDescription}>
                    Continues indefinitely.
                  </p>
                </div>
              </label>

              <label
                className={`${styles.radioOption} ${watchedDuration === "FIXED" ? styles.radioOptionActive : ""}`}
              >
                <input
                  type='radio'
                  value='FIXED'
                  className={styles.radioInput}
                  {...register("durationType")}
                />
                <div>
                  <p className={styles.radioTitle}>Set period</p>
                  <p className={styles.radioDescription}>
                    Runs for a specific timeframe.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {watchedDuration === "FIXED" && (
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor='editStart'>
                  Start date
                </label>
                <input
                  id='editStart'
                  type='date'
                  min={todayIso}
                  className={`${styles.input} ${errors.startDate ? styles.inputError : ""}`}
                  {...register("startDate")}
                />
                {errors.startDate && (
                  <span className={styles.fieldError}>
                    {errors.startDate.message}
                  </span>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor='editEnd'>
                  End date
                </label>
                <input
                  id='editEnd'
                  type='date'
                  min={todayIso}
                  className={`${styles.input} ${errors.endDate ? styles.inputError : ""}`}
                  {...register("endDate")}
                />
                {errors.endDate && (
                  <span className={styles.fieldError}>
                    {errors.endDate.message}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type='button'
              className={styles.cancelBtn}
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type='submit'
              className={styles.primaryBtn}
              disabled={saving || !isDirty}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.fieldLabel}>Day</span>
            <p className={styles.infoValue}>{dayLabel}</p>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.fieldLabel}>Frequency</span>
            <p className={styles.infoValue}>{cadenceLabel}</p>
          </div>

          {schedule.typicalArrivalTime && (
            <div className={styles.infoRow}>
              <span className={styles.fieldLabel}>Arrival time</span>
              <p className={styles.infoValue}>{schedule.typicalArrivalTime}</p>
            </div>
          )}

          {(addrLine1 || addrLine2) && (
            <div className={styles.infoRow}>
              <span className={styles.fieldLabel}>Address</span>
              {addrLine1 && <p className={styles.infoValue}>{addrLine1}</p>}
              {addrLine2 && (
                <p className={styles.infoValueSecondary}>{addrLine2}</p>
              )}
            </div>
          )}

          {schedule.accessNotes && (
            <div className={styles.infoRow}>
              <span className={styles.fieldLabel}>Notes</span>
              <p className={styles.infoValueNotes}>{schedule.accessNotes}</p>
            </div>
          )}

          <div className={styles.infoRow}>
            <span className={styles.fieldLabel}>Duration</span>
            <p className={styles.infoValueDuration}>{durationDisplay}</p>
          </div>
        </div>
      )}
    </section>
  );
}
