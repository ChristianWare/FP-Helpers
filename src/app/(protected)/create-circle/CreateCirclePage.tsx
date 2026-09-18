/* eslint-disable react-hooks/incompatible-library */
// app/(protected)/create-circle/CreateCirclePage.tsx
"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CreateCircleSchema,
  CreateCircleSchemaType,
} from "@/schemas/CreateCircleSchema";
import { createCircle } from "@/actions/circles/createCircle";
import { US_STATES } from "@/lib/states";
import styles from "./CreateCirclePage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SchedulePicker from "@/components/circles/SchedulePicker/SchedulePicker";
import DateField from "@/components/shared/DateField/DateField";
import {
  computeScheduleKeys,
  dateKeyToNoonUtc,
  describeSchedule,
  isDateKey,
  localDateKey,
  resolveScheduleDays,
} from "@/lib/shifts/scheduleDates";
import toast from "react-hot-toast";

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatZip(value: string): string {
  return value.replace(/\D/g, "").slice(0, 5);
}

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

// ——— Steps ———
// Keyed by id (not by index) so steps can be reordered or added without
// renumbering everything. Order: the circle type comes first because it
// changes the wording of nearly every step after it, and "how long" comes
// before "how often" so the schedule step can show a real count of visits.

type StepId =
  | "type"
  | "circle"
  | "recipient"
  | "location"
  | "duration"
  | "schedule"
  | "final";

const STEP_ORDER: StepId[] = [
  "type",
  "circle",
  "recipient",
  "location",
  "duration",
  "schedule",
  "final",
];

function stepCopy(
  id: StepId,
  isMealTrain: boolean,
): { title: string; subtitle: string } {
  switch (id) {
    case "type":
      return {
        title: "What kind of circle is this?",
        subtitle: "This decides how helpers get their days.",
      };
    case "circle":
      return {
        title: "Name your circle",
        subtitle: "A short name so everyone knows what this is.",
      };
    case "recipient":
      return {
        title: isMealTrain ? "Who are the meals for?" : "Who are you helping?",
        subtitle:
          "Enter their info and set a password you'll share with them so they can sign in.",
      };
    case "location":
      return {
        title: isMealTrain
          ? "Where to drop meals off"
          : "Where to drop things off",
        subtitle: "Optional for now — you can fill this in later too.",
      };
    case "duration":
      return {
        title: "How long will this run?",
        subtitle: isMealTrain
          ? "Most meal trains run for a set period — a couple of weeks after a surgery or a new baby. Pick ongoing if there's no end in sight."
          : "Ongoing is the default. Pick a timeframe if this is for a set period (e.g. 6 weeks of post-surgery help).",
      };
    case "schedule":
      return {
        title: isMealTrain ? "Which days need a meal?" : "How often, and when?",
        subtitle: isMealTrain
          ? "Every day you pick becomes an open spot people can sign up for."
          : "Set the days and cadence for the rotation.",
      };
    case "final":
      return {
        title: isMealTrain ? "A few details for the cooks" : "Almost there",
        subtitle: isMealTrain
          ? "All optional, but it's the first thing people ask before they cook."
          : "One last thing before we set everything up.",
      };
  }
}

const STEP_FIELDS: Record<StepId, (keyof CreateCircleSchemaType)[]> = {
  type: ["circleType"],
  circle: ["circleName"],
  recipient: [
    "recipientFirstName",
    "recipientLastName",
    "recipientEmail",
    "recipientPhone",
    "recipientPassword",
    "recipientConfirmPassword",
  ],
  location: ["address", "addressCity", "addressState", "addressZip"],
  duration: ["durationType", "startDate", "endDate"],
  schedule: [
    "scheduleFrequency",
    "rotationDayOfWeek",
    "rotationDaysOfWeek",
    "rotationCadence",
    "typicalArrivalTime",
  ],
  final: [
    "organizerInRotation",
    "listedInDirectory",
    "mealHouseholdSize",
    "mealAllergies",
    "mealPreferences",
  ],
};

function formatDateKeyLong(key: string): string {
  return dateKeyToNoonUtc(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

type Props = {
  organizerFirstName: string;
};

export default function CreateCirclePage({ organizerFirstName }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [isAnimating, setIsAnimating] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCircleSchemaType>({
    resolver: zodResolver(CreateCircleSchema),
    defaultValues: {
      circleType: "STANDARD",
      scheduleFrequency: "ONE_DAY",
      rotationDayOfWeek: 6,
      rotationDaysOfWeek: [],
      rotationCadence: "WEEKLY",
      durationType: "INDEFINITE",
      startDate: "",
      endDate: "",
      organizerInRotation: true,
      listedInDirectory: false,
      mealHouseholdSize: "",
      mealAllergies: "",
      mealPreferences: "",
    },
    mode: "onTouched",
  });

  const circleType = watch("circleType");
  const durationType = watch("durationType");
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const scheduleFrequency = watch("scheduleFrequency");
  const rotationDayOfWeek = watch("rotationDayOfWeek");
  const rotationDaysOfWeek = watch("rotationDaysOfWeek");
  const rotationCadence = watch("rotationCadence");

  const isMealTrain = circleType === "MEAL_TRAIN";
  const watchedListed = watch("listedInDirectory");
  const watchedRecipientFirstName = watch("recipientFirstName");
  const stepId = STEP_ORDER[currentStep];

  // Picking a type sets sensible starting points for the later steps.
  // Only runs when the choice actually changes, so it never overwrites
  // something the organizer went back and adjusted by hand.
  const handleTypeChange = (type: "STANDARD" | "MEAL_TRAIN") => {
    if (type === circleType) return;
    setValue("circleType", type, { shouldValidate: true });
    if (type === "MEAL_TRAIN") {
      setValue("durationType", "FIXED");
      setValue("scheduleFrequency", "DAILY");
    } else {
      setValue("durationType", "INDEFINITE");
      setValue("scheduleFrequency", "ONE_DAY");
    }
  };

  const goToStep = useCallback(
    async (targetStep: number) => {
      if (isAnimating) return;

      if (targetStep > currentStep) {
        const fieldsToValidate = STEP_FIELDS[STEP_ORDER[currentStep]];
        if (fieldsToValidate && fieldsToValidate.length > 0) {
          const isValid = await trigger(fieldsToValidate);
          if (!isValid) return;
        }
      }

      setDirection(targetStep > currentStep ? "forward" : "back");
      setIsAnimating(true);

      setTimeout(() => {
        setCurrentStep(targetStep);
        setError(null);
        setTimeout(() => {
          setIsAnimating(false);
        }, 50);
      }, 300);
    },
    [currentStep, isAnimating, trigger],
  );

  const onSubmit = async (values: CreateCircleSchemaType) => {
    setError(null);
    setLoading(true);

    const result = await createCircle(values);

    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
      setLoading(false);
      return;
    }

    if (result?.success && result.circleId) {
      toast.success(`${values.circleName} is ready!`);
      router.replace(
        `/circles/${result.circleId}?created=1${result.recipientHadAccount ? "&existing=1" : ""}`,
      );
      router.refresh();
    }
  };

  const onInvalid = (formErrors: typeof errors) => {
    const errorFields = Object.keys(formErrors);
    if (errorFields.length > 0) {
      setError(
        `Please go back and check these fields: ${errorFields.join(", ")}`,
      );
    }
  };

  const step = stepCopy(stepId, isMealTrain);
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEP_ORDER.length - 1;

  // The organizer's own calendar day (not UTC) for the date pickers
  const todayIso = localDateKey();

  // ——— Live schedule summary for the "how often" step ———
  const chosenDays = resolveScheduleDays({
    scheduleFrequency,
    rotationDayOfWeek,
    rotationDaysOfWeek: rotationDaysOfWeek ?? [],
  });
  const visitWord = isMealTrain ? "meal" : "visit";
  let scheduleSummary: string | null = null;
  if (chosenDays.length > 0) {
    const hasPeriod =
      durationType === "FIXED" &&
      isDateKey(startDate) &&
      isDateKey(endDate) &&
      endDate > startDate;
    if (hasPeriod) {
      const fromKey = startDate > todayIso ? startDate : todayIso;
      const keys = computeScheduleKeys({
        days: chosenDays,
        cadence: rotationCadence,
        fromKey,
        untilKey: endDate,
      });
      scheduleSummary =
        keys.length === 0
          ? `None of those days fall between your start and end dates.`
          : keys.length === 1
            ? `That's 1 ${visitWord}, on ${formatDateKeyLong(keys[0])}.`
            : `That's ${keys.length} ${visitWord}s, from ${formatDateKeyLong(keys[0])} through ${formatDateKeyLong(keys[keys.length - 1])}.`;
    } else {
      scheduleSummary = `${describeSchedule(chosenDays, rotationCadence)}, until you end the circle.`;
    }
  }

  // ——— "Who can find this?" — the visibility choice on the final step.
  // Same setting as the toggle on the circle page; this just asks up front.
  const visibilityChooser = (
    <div className={styles.field}>
      <p className={styles.label}>
        Who can find this {isMealTrain ? "meal train" : "circle"}?
      </p>
      <div className={styles.radioGroup}>
        <label
          className={`${styles.radioOption} ${watchedListed ? styles.radioOptionActive : ""}`}
        >
          <input
            type='radio'
            name='listedInDirectory'
            className={styles.radioInput}
            checked={watchedListed}
            onChange={() => setValue("listedInDirectory", true)}
          />
          <div className={styles.radioContent}>
            <p className={styles.radioTitle}>Share with the congregation</p>
            <p className={styles.radioDescription}>
              Listed on the Find a circle page, where signed-in members can see
              it and sign up to help. Only the name, who it&apos;s for, and the
              schedule are shown &mdash; never the address or personal details.
            </p>
          </div>
        </label>

        <label
          className={`${styles.radioOption} ${!watchedListed ? styles.radioOptionActive : ""}`}
        >
          <input
            type='radio'
            name='listedInDirectory'
            className={styles.radioInput}
            checked={!watchedListed}
            onChange={() => setValue("listedInDirectory", false)}
          />
          <div className={styles.radioContent}>
            <p className={styles.radioTitle}>Keep it private</p>
            <p className={styles.radioDescription}>
              Only people you share the invite link with can find it.
            </p>
          </div>
        </label>
      </div>
      <p className={styles.helpText}>
        You can change this any time on the circle&apos;s page
        {watchedRecipientFirstName
          ? ` — worth checking with ${watchedRecipientFirstName} first`
          : ""}
        .
      </p>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <LayoutWrapper>
          <div className={styles.wrapper}>
            <header className={styles.header}>
              <Link href='/dashboard' className={styles.backLink}>
                ← Dashboard
              </Link>
              <p className={styles.greeting}>
                Hi {organizerFirstName} —{" "}
                {isMealTrain
                  ? "let's set up a meal train."
                  : "let's set up a care circle."}
              </p>
            </header>

            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${((currentStep + 1) / STEP_ORDER.length) * 100}%`,
                }}
              />
            </div>

            <div className={styles.stepIndicator}>
              <span className={styles.stepCount}>
                Step {currentStep + 1} of {STEP_ORDER.length}
              </span>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
              <div className={styles.stepContainer}>
                <div
                  className={`${styles.stepContent} ${
                    isAnimating
                      ? direction === "forward"
                        ? styles.exitLeft
                        : styles.exitRight
                      : styles.enterActive
                  }`}
                >
                  <div className={styles.stepHeader}>
                    <h1 className={styles.stepTitle}>{step.title}</h1>
                    <p className={styles.stepSubtitle}>{step.subtitle}</p>
                  </div>

                  {/* Circle type */}
                  {stepId === "type" && (
                    <div className={styles.fields}>
                      <div className={styles.radioGroup}>
                        <label
                          className={`${styles.radioOption} ${!isMealTrain ? styles.radioOptionActive : ""}`}
                        >
                          <input
                            type='radio'
                            name='circleType'
                            value='STANDARD'
                            className={styles.radioInput}
                            checked={!isMealTrain}
                            onChange={() => handleTypeChange("STANDARD")}
                          />
                          <div className={styles.radioContent}>
                            <p className={styles.radioTitle}>Standard circle</p>
                            <p className={styles.radioDescription}>
                              Helpers take turns automatically on a set
                              schedule. Includes the shopping list and
                              prescription pickups.
                            </p>
                          </div>
                        </label>

                        <label
                          className={`${styles.radioOption} ${isMealTrain ? styles.radioOptionActive : ""}`}
                        >
                          <input
                            type='radio'
                            name='circleType'
                            value='MEAL_TRAIN'
                            className={styles.radioInput}
                            checked={isMealTrain}
                            onChange={() => handleTypeChange("MEAL_TRAIN")}
                          />
                          <div className={styles.radioContent}>
                            <p className={styles.radioTitle}>Meal train</p>
                            <p className={styles.radioDescription}>
                              You choose which days need a meal. Helpers pick
                              the days that work for them and say what
                              they&apos;re bringing.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Circle name */}
                  {stepId === "circle" && (
                    <div className={styles.fields}>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor='circleName'>
                          Circle name
                        </label>
                        <input
                          id='circleName'
                          type='text'
                          className={`${styles.input} ${errors.circleName ? styles.inputError : ""}`}
                          placeholder={
                            isMealTrain
                              ? "Meals for the Brooks family"
                              : "Harold's Circle"
                          }
                          autoFocus
                          {...register("circleName")}
                        />
                        <span className={styles.helpText}>
                          {"Usually the recipient's name works great."}
                        </span>
                        {errors.circleName && (
                          <span className={styles.fieldError}>
                            {errors.circleName.message}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recipient */}
                  {stepId === "recipient" && (
                    <div className={styles.fields}>
                      <div className={styles.row}>
                        <div className={styles.field}>
                          <label
                            className={styles.label}
                            htmlFor='recipientFirstName'
                          >
                            First name
                          </label>
                          <input
                            id='recipientFirstName'
                            type='text'
                            className={`${styles.input} ${errors.recipientFirstName ? styles.inputError : ""}`}
                            placeholder='Harold'
                            autoFocus
                            {...register("recipientFirstName")}
                          />
                          {errors.recipientFirstName && (
                            <span className={styles.fieldError}>
                              {errors.recipientFirstName.message}
                            </span>
                          )}
                        </div>
                        <div className={styles.field}>
                          <label
                            className={styles.label}
                            htmlFor='recipientLastName'
                          >
                            Last name
                          </label>
                          <input
                            id='recipientLastName'
                            type='text'
                            className={`${styles.input} ${errors.recipientLastName ? styles.inputError : ""}`}
                            placeholder='Brooks'
                            {...register("recipientLastName")}
                          />
                          {errors.recipientLastName && (
                            <span className={styles.fieldError}>
                              {errors.recipientLastName.message}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={styles.field}>
                        <label
                          className={styles.label}
                          htmlFor='recipientEmail'
                        >
                          Email address
                        </label>
                        <input
                          id='recipientEmail'
                          type='email'
                          className={`${styles.input} ${errors.recipientEmail ? styles.inputError : ""}`}
                          placeholder='harold@example.com'
                          {...register("recipientEmail")}
                        />
                        {errors.recipientEmail && (
                          <span className={styles.fieldError}>
                            {errors.recipientEmail.message}
                          </span>
                        )}
                      </div>

                      <div className={styles.field}>
                        <label
                          className={styles.label}
                          htmlFor='recipientPhone'
                        >
                          Phone number
                        </label>
                        <input
                          id='recipientPhone'
                          type='tel'
                          className={`${styles.input} ${errors.recipientPhone ? styles.inputError : ""}`}
                          placeholder='(555) 123-4567'
                          {...register("recipientPhone", {
                            onChange: (e) => {
                              const formatted = formatPhoneNumber(
                                e.target.value,
                              );
                              setValue("recipientPhone", formatted, {
                                shouldValidate: false,
                              });
                            },
                          })}
                        />
                        {errors.recipientPhone && (
                          <span className={styles.fieldError}>
                            {errors.recipientPhone.message}
                          </span>
                        )}
                      </div>

                      <div className={styles.row}>
                        <div className={styles.field}>
                          <label
                            className={styles.label}
                            htmlFor='recipientPassword'
                          >
                            Set a password for them
                          </label>
                          <input
                            id='recipientPassword'
                            type='password'
                            className={`${styles.input} ${errors.recipientPassword ? styles.inputError : ""}`}
                            placeholder='At least 8 characters'
                            autoComplete='new-password'
                            {...register("recipientPassword")}
                          />
                          <span className={styles.helpText}>
                            {"You'll share this with them so they can sign in."}
                          </span>
                          {errors.recipientPassword && (
                            <span className={styles.fieldError}>
                              {errors.recipientPassword.message}
                            </span>
                          )}
                        </div>
                        <div className={styles.field}>
                          <label
                            className={styles.label}
                            htmlFor='recipientConfirmPassword'
                          >
                            Confirm password
                          </label>
                          <input
                            id='recipientConfirmPassword'
                            type='password'
                            className={`${styles.input} ${errors.recipientConfirmPassword ? styles.inputError : ""}`}
                            placeholder='Re-enter password'
                            autoComplete='new-password'
                            {...register("recipientConfirmPassword")}
                          />
                          {errors.recipientConfirmPassword && (
                            <span className={styles.fieldError}>
                              {errors.recipientConfirmPassword.message}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {stepId === "location" && (
                    <div className={styles.fields}>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor='address'>
                          Street address
                        </label>
                        <input
                          id='address'
                          type='text'
                          className={`${styles.input} ${errors.address ? styles.inputError : ""}`}
                          placeholder='123 Friendship Park Dr'
                          autoFocus
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
                          <label className={styles.label} htmlFor='addressCity'>
                            City
                          </label>
                          <input
                            id='addressCity'
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
                          <label
                            className={styles.label}
                            htmlFor='addressState'
                          >
                            State
                          </label>
                          <select
                            id='addressState'
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
                          <label className={styles.label} htmlFor='addressZip'>
                            ZIP
                          </label>
                          <input
                            id='addressZip'
                            type='text'
                            inputMode='numeric'
                            className={`${styles.input} ${errors.addressZip ? styles.inputError : ""}`}
                            placeholder='85001'
                            {...register("addressZip", {
                              onChange: (e) => {
                                const formatted = formatZip(e.target.value);
                                setValue("addressZip", formatted, {
                                  shouldValidate: false,
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

                      <div className={styles.field}>
                        <label className={styles.label} htmlFor='accessNotes'>
                          Anything helpers should know?
                        </label>
                        <textarea
                          id='accessNotes'
                          className={`${styles.textarea} ${errors.accessNotes ? styles.inputError : ""}`}
                          placeholder='Ring the doorbell twice. Dog is friendly.'
                          rows={3}
                          {...register("accessNotes")}
                        />
                        {errors.accessNotes && (
                          <span className={styles.fieldError}>
                            {errors.accessNotes.message}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Duration (now BEFORE the schedule step) */}
                  {stepId === "duration" && (
                    <div className={styles.fields}>
                      <div className={styles.radioGroup}>
                        <label
                          className={`${styles.radioOption} ${durationType === "INDEFINITE" ? styles.radioOptionActive : ""}`}
                        >
                          <input
                            type='radio'
                            value='INDEFINITE'
                            className={styles.radioInput}
                            {...register("durationType")}
                          />
                          <div className={styles.radioContent}>
                            <p className={styles.radioTitle}>Ongoing</p>
                            <p className={styles.radioDescription}>
                              The circle continues indefinitely. New shifts get
                              scheduled automatically.
                            </p>
                          </div>
                        </label>

                        <label
                          className={`${styles.radioOption} ${durationType === "FIXED" ? styles.radioOptionActive : ""}`}
                        >
                          <input
                            type='radio'
                            value='FIXED'
                            className={styles.radioInput}
                            {...register("durationType")}
                          />
                          <div className={styles.radioContent}>
                            <p className={styles.radioTitle}>Set period</p>
                            <p className={styles.radioDescription}>
                              The circle runs for a specific timeframe — like 6
                              weeks of post-surgery meals. It&apos;ll
                              automatically close when the period ends.
                            </p>
                          </div>
                        </label>
                      </div>

                      {durationType === "FIXED" && (
                        <div className={styles.row}>
                          <div className={styles.field}>
                            <label className={styles.label} htmlFor='startDate'>
                              Start date
                            </label>
                            <DateField
                              id='startDate'
                              value={startDate ?? ""}
                              min={todayIso}
                              hasError={!!errors.startDate}
                              onChange={(value) =>
                                setValue("startDate", value, {
                                  shouldValidate: true,
                                })
                              }
                            />
                            {errors.startDate && (
                              <span className={styles.fieldError}>
                                {errors.startDate.message}
                              </span>
                            )}
                          </div>
                          <div className={styles.field}>
                            <label className={styles.label} htmlFor='endDate'>
                              End date
                            </label>
                            <DateField
                              id='endDate'
                              value={endDate ?? ""}
                              min={startDate || todayIso}
                              hasError={!!errors.endDate}
                              onChange={(value) =>
                                setValue("endDate", value, {
                                  shouldValidate: true,
                                })
                              }
                            />
                            {errors.endDate && (
                              <span className={styles.fieldError}>
                                {errors.endDate.message}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Schedule (now AFTER duration, so it can count real visits) */}
                  {stepId === "schedule" && (
                    <div className={styles.fields}>
                      <SchedulePicker
                        idPrefix='create'
                        frequency={scheduleFrequency}
                        singleDay={rotationDayOfWeek}
                        multipleDays={rotationDaysOfWeek ?? []}
                        cadence={rotationCadence}
                        onFrequencyChange={(value) => {
                          setValue("scheduleFrequency", value, {
                            shouldValidate: true,
                          });
                          // "Every other week" doesn't apply to every day
                          if (value === "DAILY") {
                            setValue("rotationCadence", "WEEKLY");
                          }
                        }}
                        onSingleDayChange={(value) =>
                          setValue("rotationDayOfWeek", value, {
                            shouldValidate: true,
                          })
                        }
                        onMultipleDaysChange={(value) =>
                          setValue("rotationDaysOfWeek", value, {
                            shouldValidate: true,
                          })
                        }
                        onCadenceChange={(value) =>
                          setValue("rotationCadence", value)
                        }
                        daysError={errors.rotationDaysOfWeek?.message}
                        scheduleError={errors.scheduleFrequency?.message}
                      />

                      {scheduleSummary && !errors.scheduleFrequency && (
                        <p
                          className={styles.scheduleSummary}
                          aria-live='polite'
                        >
                          {scheduleSummary}
                        </p>
                      )}

                      <div className={styles.field}>
                        <label
                          className={styles.label}
                          htmlFor='typicalArrivalTime'
                        >
                          {isMealTrain
                            ? "Preferred drop-off time"
                            : "Typical arrival time"}{" "}
                          <span className={styles.optional}>(optional)</span>
                        </label>
                        <select
                          id='typicalArrivalTime'
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
                    </div>
                  )}

                  {/* Final step */}
                  {stepId === "final" && !isMealTrain && (
                    <div className={styles.fields}>
                      <div className={styles.checkboxField}>
                        <input
                          id='organizerInRotation'
                          type='checkbox'
                          className={styles.checkbox}
                          {...register("organizerInRotation")}
                        />
                        <div>
                          <label
                            htmlFor='organizerInRotation'
                            className={styles.checkboxLabel}
                          >
                            Add me to the rotation
                          </label>
                          <p className={styles.checkboxHint}>
                            {
                              "You'll take turns with the other helpers. Uncheck if you're just organizing."
                            }
                          </p>
                        </div>
                      </div>

                      {visibilityChooser}
                    </div>
                  )}

                  {/* Final step — meal train: who people are cooking for */}
                  {stepId === "final" && isMealTrain && (
                    <div className={styles.fields}>
                      <div className={styles.field}>
                        <label
                          className={styles.label}
                          htmlFor='mealHouseholdSize'
                        >
                          How many people are eating?{" "}
                          <span className={styles.optional}>(optional)</span>
                        </label>
                        <input
                          id='mealHouseholdSize'
                          type='text'
                          className={`${styles.input} ${errors.mealHouseholdSize ? styles.inputError : ""}`}
                          placeholder='2 adults, 3 kids'
                          autoFocus
                          {...register("mealHouseholdSize")}
                        />
                        {errors.mealHouseholdSize && (
                          <span className={styles.fieldError}>
                            {errors.mealHouseholdSize.message}
                          </span>
                        )}
                      </div>

                      <div className={styles.field}>
                        <label className={styles.label} htmlFor='mealAllergies'>
                          Allergies and foods to avoid{" "}
                          <span className={styles.optional}>(optional)</span>
                        </label>
                        <textarea
                          id='mealAllergies'
                          className={`${styles.textarea} ${errors.mealAllergies ? styles.inputError : ""}`}
                          placeholder='Tree nut allergy. No shellfish.'
                          rows={2}
                          {...register("mealAllergies")}
                        />
                        {errors.mealAllergies && (
                          <span className={styles.fieldError}>
                            {errors.mealAllergies.message}
                          </span>
                        )}
                      </div>

                      <div className={styles.field}>
                        <label
                          className={styles.label}
                          htmlFor='mealPreferences'
                        >
                          Anything else cooks should know?{" "}
                          <span className={styles.optional}>(optional)</span>
                        </label>
                        <textarea
                          id='mealPreferences'
                          className={`${styles.textarea} ${errors.mealPreferences ? styles.inputError : ""}`}
                          placeholder='The kids love pasta. Not big on spicy food. Disposable containers are easiest.'
                          rows={3}
                          {...register("mealPreferences")}
                        />
                        {errors.mealPreferences && (
                          <span className={styles.fieldError}>
                            {errors.mealPreferences.message}
                          </span>
                        )}
                      </div>

                      <p className={styles.helpText}>
                        Want to bring a meal yourself? Once the circle is
                        created you can sign up for a day like everyone else.
                      </p>

                      {visibilityChooser}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className={styles.errorBanner}>
                  <span>{error}</span>
                </div>
              )}

              <div className={styles.actions}>
                {isFirstStep ? (
                  <Link href='/dashboard' className={styles.navBtnSecondary}>
                    Cancel
                  </Link>
                ) : (
                  <button
                    type='button'
                    className={styles.navBtnSecondary}
                    onClick={() => goToStep(currentStep - 1)}
                    disabled={isAnimating}
                  >
                    ← Back
                  </button>
                )}

                {isLastStep ? (
                  <button
                    type='submit'
                    className={styles.navBtnPrimary}
                    disabled={loading || isAnimating}
                  >
                    {loading
                      ? "Setting things up..."
                      : isMealTrain
                        ? "Create meal train"
                        : "Create circle"}
                  </button>
                ) : (
                  <button
                    type='button'
                    className={styles.navBtnPrimary}
                    onClick={() => goToStep(currentStep + 1)}
                    disabled={isAnimating}
                  >
                    Next →
                  </button>
                )}
              </div>
            </form>
          </div>
        </LayoutWrapper>
      </div>
    </div>
  );
}
