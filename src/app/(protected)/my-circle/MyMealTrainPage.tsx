// app/(protected)/my-circle/MyMealTrainPage.tsx
//
// What the person RECEIVING a meal train sees: who's coming, when, and what
// they're bringing — plus their household details, which they can edit.
// (The standard recipient page is about a grocery list; none of that applies.)
"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import base from "./MyCirclePage.module.css";
import styles from "./MyMealTrainPage.module.css";
import { formatPhone } from "@/lib/format";
import { formatShiftDate, formatShiftFullDate } from "@/lib/shifts/formatShift";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import MealDetailsSection from "@/components/meals/MealDetailsSection/MealDetailsSection";

type Day = {
  id: string;
  scheduledDate: string;
  mealDescription: string | null;
  mealNotes: string | null;
  helper: { firstName: string; lastName: string; phone: string } | null;
};

type Props = {
  circleId: string;
  circleName: string;
  userName: string;
  userEmail: string;
  hasDashboard: boolean;
  isFinished: boolean;
  scheduleLabel: string;
  dropoffTime: string | null;
  details: {
    mealHouseholdSize: string | null;
    mealAllergies: string | null;
    mealPreferences: string | null;
  };
  days: Day[];
  helpers: {
    firstName: string;
    lastName: string;
    phone: string;
    isOrganizer: boolean;
  }[];
};

export default function MyMealTrainPage({
  circleId,
  circleName,
  userName,
  userEmail,
  hasDashboard,
  isFinished,
  scheduleLabel,
  dropoffTime,
  details,
  days,
  helpers,
}: Props) {
  // The next day someone has actually claimed
  const nextMeal = days.find((d) => d.helper) ?? null;
  const openCount = days.filter((d) => !d.helper).length;

  return (
    <section className={base.container}>
      <div className={base.content}>
        <LayoutWrapper>
          <header className={base.header}>
            <div>
              {hasDashboard && (
                <Link href='/dashboard' className={base.dashboardLink}>
                  ← Circles I help with
                </Link>
              )}
              <h1 className={base.title}>Hi {userName}</h1>
            </div>
            <div className={base.accountInfo}>
              <button
                type='button'
                className={base.signOutBtn}
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign out
              </button>
              <p className={base.userEmail}>{userEmail}</p>
            </div>
          </header>

          <div className={base.subtitle}>
            <SectionHeading
              title={`${circleName} — friends are bringing you meals.`}
              color='black'
              dotColor='purpleDot'
            />
          </div>

          {/* Next meal */}
          {nextMeal?.helper && (
            <section className={base.thisWeekBanner}>
              <h2 className={base.thisWeekHelper}>
                {nextMeal.helper.firstName} {nextMeal.helper.lastName} is
                bringing your next meal
              </h2>
              <p className={base.thisWeekDate}>
                {formatShiftFullDate(new Date(nextMeal.scheduledDate))}
                {dropoffTime && ` · around ${dropoffTime}`}
              </p>
              {nextMeal.mealDescription && (
                <p className={styles.bannerMeal}>{nextMeal.mealDescription}</p>
              )}
              <a
                href={`tel:${nextMeal.helper.phone}`}
                className={base.thisWeekPhone}
              >
                {formatPhone(nextMeal.helper.phone)}
              </a>
            </section>
          )}

          {/* The calendar */}
          <section className={base.section}>
            <div className={base.sectionHeader}>
              <h2 className={base.sectionTitle}>Coming up</h2>
              <span className={base.itemCount}>{scheduleLabel}</span>
            </div>

            {days.length === 0 ? (
              <p className={base.emptyText}>
                {isFinished
                  ? "This meal train has finished. We hope it helped."
                  : "No meals on the calendar yet. They'll show up here as soon as your friends start signing up."}
              </p>
            ) : (
              <>
                {openCount > 0 && (
                  <p className={styles.openNote}>
                    {openCount} {openCount === 1 ? "day is" : "days are"} still
                    open — your organizer can see that too and will nudge
                    people.
                  </p>
                )}
                <div className={base.rotationList}>
                  {days.map((day) => {
                    const date = new Date(day.scheduledDate);
                    return (
                      <div key={day.id} className={base.rotationRow}>
                        <div className={base.rotationDate}>
                          <span className={base.rotationDateMain}>
                            {formatShiftDate(date)}
                          </span>
                          <span className={base.rotationDateFull}>
                            {formatShiftFullDate(date)}
                          </span>
                        </div>
                        <div className={styles.dayDetail}>
                          {day.helper ? (
                            <>
                              <p className={styles.dayHelper}>
                                {day.helper.firstName} {day.helper.lastName}
                              </p>
                              <p
                                className={
                                  day.mealDescription
                                    ? styles.dayMeal
                                    : styles.dayMealMissing
                                }
                              >
                                {day.mealDescription ?? "Meal to be decided"}
                              </p>
                              {day.mealNotes && (
                                <p className={styles.dayNotes}>
                                  {day.mealNotes}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className={styles.dayOpen}>
                              Nobody signed up yet
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* Household details — the recipient can edit these */}
          <MealDetailsSection
            circleId={circleId}
            details={details}
            canEdit={!isFinished}
            audience='recipient'
            recipientFirstName={null}
          />

          {/* Who's helping */}
          {helpers.length > 0 && (
            <section className={base.section}>
              <div className={base.sectionHeader}>
                <h2 className={base.sectionTitle}>Who&apos;s helping</h2>
              </div>
              <div className={base.helperList}>
                {helpers.map((h, i) => (
                  <div key={i} className={base.helperCard}>
                    <p className={base.helperName}>
                      {h.firstName} {h.lastName}
                    </p>
                    {h.isOrganizer && (
                      <p className={styles.organizerTag}>Organizer</p>
                    )}
                    <a href={`tel:${h.phone}`} className={base.helperPhone}>
                      {formatPhone(h.phone)}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}
        </LayoutWrapper>
      </div>
    </section>
  );
}
