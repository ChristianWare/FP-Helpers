// app/(auth)/join/[token]/JoinPage.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RegistrationForm from "@/components/auth/RegistrationForm/RegistrationForm";
import { joinCircle } from "@/actions/circles/joinCircle";
import { joinCircleAsExistingUser } from "@/actions/circles/joinCircleAsExistingUser";
import { RegisterSchemaType } from "@/schemas/RegisterSchema";
import { formatShiftDate, formatShiftFullDate } from "@/lib/shifts/formatShift";
import styles from "./JoinPage.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

type Slot = {
  id: string;
  scheduledDate: string;
  takenBy: string | null; // first name only — this page is public
  mealDescription: string | null;
};

type MealInfo = {
  householdSize: string | null;
  allergies: string | null;
  preferences: string | null;
  dropoffTime: string | null;
  scheduleLabel: string;
};

type Props = {
  token: string;
  circleId: string;
  circleName: string;
  circleType: "STANDARD" | "MEAL_TRAIN";
  recipientName: string | null;
  status: "valid" | "expired" | "inactive";
  /** Set when the visitor is already signed in. */
  viewer: { firstName: string; isMember: boolean; isRecipient: boolean } | null;
  /** Meal trains only. */
  slots: Slot[];
  mealInfo: MealInfo | null;
};

export default function JoinPage({
  token,
  circleId,
  circleName,
  circleType,
  recipientName,
  status,
  viewer,
  slots,
  mealInfo,
}: Props) {
  const router = useRouter();
  const isMealTrain = circleType === "MEAL_TRAIN";

  // Days ticked on the calendar → what they're bringing on each
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickedIds = Object.keys(picked);
  const openSlots = slots.filter((s) => !s.takenBy);

  const selections = pickedIds.map((shiftId) => ({
    shiftId,
    mealDescription: picked[shiftId],
  }));

  const toggleDay = (id: string) => {
    setPicked((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = "";
      return next;
    });
  };

  // New account + join (+ claim the picked days)
  const handleRegister = async (values: RegisterSchemaType) => {
    return joinCircle(token, values, selections);
  };

  // Already signed in → one tap
  const handleJoinAsViewer = async () => {
    setError(null);
    setJoining(true);
    const result = await joinCircleAsExistingUser(token, selections);
    if (!result.success) {
      setError(result.error);
      setJoining(false);
      return;
    }
    router.push(result.redirectTo);
    router.refresh();
  };

  if (status !== "valid") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.errorIcon}>⚠️</div>
            <h1 className={styles.heading}>
              {status === "expired"
                ? "This invitation has expired"
                : "This invitation is no longer active"}
            </h1>
            <p className={styles.subheading}>
              Please ask whoever shared this link with you for a new one.
            </p>
          </div>
          <Link href='/' className={styles.homeLink}>
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  // The person this circle is FOR opened the helper link
  if (viewer?.isRecipient) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <h1 className={styles.heading}>This one&apos;s for you</h1>
            <p className={styles.subheading}>
              {circleName} was set up to help you, so there&apos;s nothing to
              sign up for. This link is the one to share with people who want to
              help.
            </p>
          </div>
          <Link
            href={`/my-circle?circle=${circleId}`}
            className={styles.primaryLink}
          >
            Go to my page
          </Link>
        </div>
      </div>
    );
  }

  const submitLabel = isMealTrain
    ? pickedIds.length === 0
      ? "Join without picking a day yet"
      : `Sign up for ${pickedIds.length} ${pickedIds.length === 1 ? "day" : "days"}`
    : "Join the circle";

  return (
    <div className={styles.page}>
      <div className={`${styles.card} ${isMealTrain ? styles.cardWide : ""}`}>
        <div className={styles.cardTop}>
          <SectionHeading
            title="You've been invited"
            color='black'
            dotColor='blackDot'
          />
          <h1 className={styles.heading}>
            {recipientName ? (
              <>
                {isMealTrain ? "Bring a meal to" : "Join the circle helping"}{" "}
                <br /> <span className={styles.name}>{recipientName}</span>
              </>
            ) : (
              `Join ${circleName}`
            )}
          </h1>
          <p className={styles.subheading}>
            {isMealTrain
              ? "Pick the days that work for you. You can say what you're bringing now or later."
              : viewer
                ? "You'll be added to the rotation with the other helpers."
                : "Create your account to start helping out on the rotation."}
          </p>
        </div>

        {/* ——— Meal train: who you're cooking for + the calendar ——— */}
        {isMealTrain && mealInfo && (
          <>
            {(mealInfo.allergies ||
              mealInfo.householdSize ||
              mealInfo.preferences ||
              mealInfo.dropoffTime) && (
              <div className={styles.infoBox}>
                {mealInfo.allergies && (
                  <div className={styles.allergyRow}>
                    <p className={styles.allergyLabel}>
                      Allergies and foods to avoid
                    </p>
                    <p className={styles.allergyText}>{mealInfo.allergies}</p>
                  </div>
                )}
                {mealInfo.householdSize && (
                  <p className={styles.infoLine}>
                    <strong>Cooking for:</strong> {mealInfo.householdSize}
                  </p>
                )}
                {mealInfo.dropoffTime && (
                  <p className={styles.infoLine}>
                    <strong>Drop-off:</strong> around {mealInfo.dropoffTime}
                  </p>
                )}
                {mealInfo.preferences && (
                  <p className={styles.infoLine}>
                    <strong>Good to know:</strong> {mealInfo.preferences}
                  </p>
                )}
              </div>
            )}

            <div className={styles.calendar}>
              <div className={styles.calendarHeader}>
                <h2 className={styles.calendarTitle}>Pick your days</h2>
                <p className={styles.calendarCount}>
                  {slots.length === 0
                    ? ""
                    : openSlots.length === 0
                      ? "All covered"
                      : `${openSlots.length} open`}
                </p>
              </div>

              {slots.length === 0 ? (
                <p className={styles.calendarEmpty}>
                  The organizer hasn&apos;t opened any days yet. You can still
                  join now and you&apos;ll see them as soon as they&apos;re
                  added.
                </p>
              ) : (
                <>
                  {openSlots.length === 0 && (
                    <p className={styles.calendarEmpty}>
                      Every day is covered right now. Join anyway and
                      you&apos;ll be able to grab a day if one opens up.
                    </p>
                  )}
                  <ul
                    className={`${styles.dayList} ${slots.length > 21 ? styles.dayListLong : ""}`}
                  >
                    {slots.map((slot) => {
                      const date = new Date(slot.scheduledDate);
                      const isPicked = slot.id in picked;
                      const taken = !!slot.takenBy;

                      return (
                        <li
                          key={slot.id}
                          className={`${styles.day} ${taken ? styles.dayTaken : ""} ${isPicked ? styles.dayPicked : ""}`}
                        >
                          <label className={styles.dayMain}>
                            <input
                              type='checkbox'
                              className={styles.dayCheckbox}
                              checked={isPicked}
                              disabled={taken}
                              onChange={() => toggleDay(slot.id)}
                            />
                            <div className={styles.dayText}>
                              <p className={styles.dayDate}>
                                {formatShiftFullDate(date)}
                              </p>
                              <p className={styles.dayStatus}>
                                {taken
                                  ? `${slot.takenBy}${slot.mealDescription ? ` · ${slot.mealDescription}` : ""}`
                                  : isPicked
                                    ? "You're taking this day"
                                    : `Open · ${formatShiftDate(date)}`}
                              </p>
                            </div>
                          </label>

                          {isPicked && (
                            <input
                              type='text'
                              className={styles.mealInput}
                              placeholder="What are you bringing? (optional — add it later if you're not sure)"
                              aria-label={`What you're bringing on ${formatShiftFullDate(date)}`}
                              value={picked[slot.id]}
                              maxLength={120}
                              onChange={(e) =>
                                setPicked((prev) => ({
                                  ...prev,
                                  [slot.id]: e.target.value,
                                }))
                              }
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </>
        )}

        {/* ——— Already signed in → one tap ——— */}
        {viewer ? (
          <div className={styles.viewerBox}>
            {viewer.isMember && !isMealTrain ? (
              <>
                <p className={styles.viewerText}>
                  You&apos;re already part of this circle, {viewer.firstName}.
                </p>
                <Link
                  href={`/circles/${circleId}`}
                  className={styles.primaryLink}
                >
                  Open the circle
                </Link>
              </>
            ) : (
              <>
                <p className={styles.viewerText}>
                  Signed in as <strong>{viewer.firstName}</strong>
                  {viewer.isMember ? " — you're already in this circle." : "."}
                </p>
                {error && (
                  <div className={styles.errorBanner} role='alert'>
                    {error}
                  </div>
                )}
                {viewer.isMember && pickedIds.length === 0 ? (
                  <Link
                    href={`/circles/${circleId}`}
                    className={styles.primaryLink}
                  >
                    Open the circle
                  </Link>
                ) : (
                  <button
                    type='button'
                    className={styles.primaryBtn}
                    onClick={handleJoinAsViewer}
                    disabled={joining}
                  >
                    {joining ? "One moment..." : submitLabel}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {isMealTrain && (
              <h2 className={styles.accountHeading}>
                {pickedIds.length > 0
                  ? "Last step: tell us who you are"
                  : "Create your account"}
              </h2>
            )}

            <RegistrationForm
              onSubmit={handleRegister}
              redirectTo='/dashboard'
              submitLabel={submitLabel}
            />

            <p className={styles.loginPrompt}>
              Already have an account?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}
                className={styles.loginLink}
              >
                Sign in
              </Link>{" "}
              and you&apos;ll come right back here.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
