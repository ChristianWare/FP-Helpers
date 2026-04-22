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
import styles from "./CreateCirclePage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const STEPS = [
  {
    id: "circle",
    title: "Name your circle",
    subtitle: "A short name so everyone knows what this is.",
    number: 1,
  },
  {
    id: "recipient",
    title: "Who are you helping?",
    subtitle:
      "We'll send them a link so they can share what they need each week.",
    number: 2,
  },
  {
    id: "location",
    title: "Where to drop things off",
    subtitle: "Optional for now — you can fill this in later too.",
    number: 3,
  },
  {
    id: "schedule",
    title: "How often, and when?",
    subtitle: "Set the day and cadence for the rotation.",
    number: 4,
  },
  {
    id: "confirm",
    title: "Almost there",
    subtitle: "One last thing before we set everything up.",
    number: 5,
  },
];

// Fields to validate per step before allowing "Next"
const STEP_FIELDS: Record<number, (keyof CreateCircleSchemaType)[]> = {
  0: ["circleName"],
  1: [
    "recipientFirstName",
    "recipientLastName",
    "recipientEmail",
    "recipientPhone",
  ],
  2: [],
  3: ["rotationDayOfWeek", "rotationCadence"],
  4: ["organizerInRotation"],
};

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
    formState: { errors },
  } = useForm<CreateCircleSchemaType>({
    resolver: zodResolver(CreateCircleSchema),
    defaultValues: {
      rotationDayOfWeek: 6,
      rotationCadence: "WEEKLY",
      organizerInRotation: true,
    },
    mode: "onTouched",
  });

  const goToStep = useCallback(
    async (targetStep: number) => {
      if (isAnimating) return;

      // If going forward, validate current step first
      if (targetStep > currentStep) {
        const fieldsToValidate = STEP_FIELDS[currentStep];
        if (fieldsToValidate && fieldsToValidate.length > 0) {
          const isValid = await trigger(fieldsToValidate);
          if (!isValid) return;
        }
      }

      setDirection(targetStep > currentStep ? "forward" : "back");
      setIsAnimating(true);

      // Small delay to let exit animation start
      setTimeout(() => {
        setCurrentStep(targetStep);
        setError(null);
        // Let enter animation complete
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
      setLoading(false);
      return;
    }

    if (result?.success && result.circleId) {
      router.push(`/circles/${result.circleId}?created=1`);
      router.refresh();
    }
  };

  const step = STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <LayoutWrapper>
          <div className={styles.wrapper}>
            {/* Header — always visible */}
            <header className={styles.header}>
              <Link href='/dashboard' className={styles.backLink}>
                ← Dashboard
              </Link>
              <p className={styles.greeting}>
                Hi {organizerFirstName} — let&apos;s set up a care circle.
              </p>
            </header>

            {/* Progress bar */}
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${((currentStep + 1) / STEPS.length) * 100}%`,
                }}
              />
            </div>

            {/* Step indicator */}
            <div className={styles.stepIndicator}>
              <span className={styles.stepCount}>
                Step {step.number} of {STEPS.length}
              </span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Step content — animated */}
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
                  {/* Step title */}
                  <div className={styles.stepHeader}>
                    <h1 className={styles.stepTitle}>{step.title}</h1>
                    <p className={styles.stepSubtitle}>{step.subtitle}</p>
                  </div>

                  {/* Step 1: Circle name */}
                  {currentStep === 0 && (
                    <div className={styles.fields}>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor='circleName'>
                          Circle name
                        </label>
                        <input
                          id='circleName'
                          type='text'
                          className={`${styles.input} ${errors.circleName ? styles.inputError : ""}`}
                          placeholder="Harold's Circle"
                          autoFocus
                          {...register("circleName")}
                        />
                        <span className={styles.helpText}>
                          Usually the recipient&apos;s name works great.
                        </span>
                        {errors.circleName && (
                          <span className={styles.fieldError}>
                            {errors.circleName.message}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Recipient info */}
                  {currentStep === 1 && (
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
                    </div>
                  )}

                  {/* Step 3: Location */}
                  {currentStep === 2 && (
                    <div className={styles.fields}>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor='address'>
                          Address
                        </label>
                        <input
                          id='address'
                          type='text'
                          className={`${styles.input} ${errors.address ? styles.inputError : ""}`}
                          placeholder='123 Friendship Park Dr, Phoenix, AZ'
                          autoFocus
                          {...register("address")}
                        />
                        {errors.address && (
                          <span className={styles.fieldError}>
                            {errors.address.message}
                          </span>
                        )}
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

                  {/* Step 4: Rotation settings */}
                  {currentStep === 3 && (
                    <div className={styles.fields}>
                      <div className={styles.row}>
                        <div className={styles.field}>
                          <label
                            className={styles.label}
                            htmlFor='rotationDayOfWeek'
                          >
                            Day of the week
                          </label>
                          <select
                            id='rotationDayOfWeek'
                            className={`${styles.input} ${errors.rotationDayOfWeek ? styles.inputError : ""}`}
                            {...register("rotationDayOfWeek", {
                              valueAsNumber: true,
                            })}
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
                          <label
                            className={styles.label}
                            htmlFor='rotationCadence'
                          >
                            How often
                          </label>
                          <select
                            id='rotationCadence'
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

                      <div className={styles.field}>
                        <label
                          className={styles.label}
                          htmlFor='typicalArrivalTime'
                        >
                          Typical arrival time{" "}
                          <span className={styles.optional}>(optional)</span>
                        </label>
                        <input
                          id='typicalArrivalTime'
                          type='text'
                          className={`${styles.input} ${errors.typicalArrivalTime ? styles.inputError : ""}`}
                          placeholder='around 10am'
                          {...register("typicalArrivalTime")}
                        />
                        {errors.typicalArrivalTime && (
                          <span className={styles.fieldError}>
                            {errors.typicalArrivalTime.message}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 5: Confirm */}
                  {currentStep === 4 && (
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
                            You&apos;ll take turns with the other helpers.
                            Uncheck if you&apos;re just organizing.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className={styles.errorBanner}>
                  <span>{error}</span>
                </div>
              )}

              {/* Navigation */}
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
                    {loading ? "Setting things up..." : "Create circle"}
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
