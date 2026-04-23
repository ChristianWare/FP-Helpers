// app/(protected)/circles/[id]/CirclePage.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./CirclePage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { formatPhone } from "@/lib/format";
import { formatRotationInterval } from "@/lib/shifts/rotationInterval";
import { formatShiftDate, formatShiftFullDate } from "@/lib/shifts/formatShift";
import DeleteCircleButton from "@/components/circles/DeleteCircleButton";
import Confetti from "@/components/shared/Confetti/Confetti";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type ShiftSummary = {
  id: string;
  scheduledDate: string;
  status: string;
  completedAt?: string | null;
};

type RotationShift = {
  id: string;
  scheduledDate: string;
  assignedUser: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

type Props = {
  circle: {
    id: string;
    name: string;
    status: string;
    address: string | null;
    rotationDayOfWeek: number;
    rotationCadence: string;
    typicalArrivalTime: string | null;
  };
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null;
  memberships: {
    id: string;
    role: string;
    inRotation: boolean;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  }[];
  currentUserId: string;
  currentUserRole: string | null;
  joinUrl: string | null;
  justCreated: boolean;
  nextShiftByHelper: Record<string, string>;
  myUpcomingShifts: ShiftSummary[];
  myRecentShifts: ShiftSummary[];
  rotationShifts: RotationShift[];
};

export default function CirclePage({
  circle,
  recipient,
  memberships,
  currentUserId,
  currentUserRole,
  joinUrl,
  justCreated,
  nextShiftByHelper,
  myUpcomingShifts,
  myRecentShifts,
  rotationShifts,
}: Props) {
  const [copied, setCopied] = useState(false);

  const helpers = memberships.filter((m) => m.role !== "RECIPIENT");
  const isAdmin = currentUserRole === "ADMIN";

  const helpersInRotation = memberships.filter(
    (m) => m.inRotation && m.role !== "RECIPIENT",
  ).length;

  const rotationIntervalLabel = formatRotationInterval(
    helpersInRotation,
    circle.rotationCadence as "WEEKLY" | "BIWEEKLY" | "CUSTOM",
  );

  const myNextShift = myUpcomingShifts[0] ?? null;

  const copyJoinLink = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <LayoutWrapper>
          <header className={styles.header}>
            <div>
              <Link href='/dashboard' className={styles.backLink}>
                ← Dashboard
              </Link>
              <h1 className={styles.title}>{circle.name}</h1>
            </div>
          </header>

          <div className={styles.subtitle}>
            <SectionHeading
              title={
                recipient
                  ? `Helping ${recipient.firstName} ${recipient.lastName}`
                  : "Your care circle"
              }
              color='black'
              dotColor='purpleDot'
            />
          </div>

          {justCreated && (
            <>
              <Confetti />
              <div className={styles.successBanner}>
                <div className={styles.successIcon}>🎉</div>
                <div>
                  <h2 className={styles.successTitle}>Your circle is ready</h2>
                  <p className={styles.successText}>
                    We&apos;ve sent {recipient?.firstName} their sign-in details
                    by email. Now invite your friends by sharing the link below.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Your next shift banner (purple hero) */}
          {myNextShift && (
            <section className={styles.helperList}>
              <div className={styles.myShiftBanner}>
                <p className={styles.myShiftLabel}>Your next shift</p>
                <h2 className={styles.myShiftDate}>
                  {formatShiftFullDate(new Date(myNextShift.scheduledDate))}
                </h2>
                {circle.typicalArrivalTime && (
                  <p className={styles.myShiftTime}>
                    Arriving around {circle.typicalArrivalTime}
                  </p>
                )}
                <Link
                  href={`/circles/${circle.id}/shifts/${myNextShift.id}`}
                  className={styles.myShiftCta}
                >
                  Open shift details →
                </Link>
              </div>
              {/* Schedule */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Schedule</h2>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoRow}>
                    <span className={styles.fieldLabel}>Day</span>
                    <p className={styles.infoValue}>
                      {DAYS_OF_WEEK[circle.rotationDayOfWeek]}
                      {circle.rotationCadence === "BIWEEKLY"
                        ? " (every other week)"
                        : ""}
                    </p>
                  </div>

                  {circle.typicalArrivalTime && (
                    <div className={styles.infoRow}>
                      <span className={styles.fieldLabel}>Arrival time</span>
                      <p className={styles.infoValue}>
                        {circle.typicalArrivalTime}
                      </p>
                    </div>
                  )}

                  {circle.address && (
                    <div className={styles.infoRow}>
                      <span className={styles.fieldLabel}>Address</span>
                      <p className={styles.infoValue}>{circle.address}</p>
                    </div>
                  )}
                </div>
              </section>
            </section>
          )}

          {/* Your other upcoming + recent */}
          {(myUpcomingShifts.length > 1 || myRecentShifts.length > 0) && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Your shifts</h2>
              </div>

              {myUpcomingShifts.length > 1 && (
                <>
                  <p className={styles.shiftsGroupLabel}>Also coming up</p>
                  <div className={styles.shiftsList}>
                    {myUpcomingShifts.slice(1).map((s) => (
                      <Link
                        key={s.id}
                        href={`/circles/${circle.id}/shifts/${s.id}`}
                        className={styles.shiftRow}
                      >
                        <div className={styles.shiftRowMain}>
                          <span className={styles.shiftRowDate}>
                            {formatShiftDate(new Date(s.scheduledDate))}
                          </span>
                          <span className={styles.shiftRowFullDate}>
                            {formatShiftFullDate(new Date(s.scheduledDate))}
                          </span>
                        </div>
                        <span className={styles.shiftRowArrow}>→</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {myRecentShifts.length > 0 && (
                <>
                  <p className={styles.shiftsGroupLabel}>Recently completed</p>
                  <div className={styles.shiftsList}>
                    {myRecentShifts.map((s) => (
                      <Link
                        key={s.id}
                        href={`/circles/${circle.id}/shifts/${s.id}`}
                        className={`${styles.shiftRow} ${styles.shiftRowCompleted}`}
                      >
                        <div className={styles.shiftRowMain}>
                          <span className={styles.shiftRowDate}>
                            {formatShiftFullDate(new Date(s.scheduledDate))}
                          </span>
                          <span className={styles.shiftRowStatus}>
                            ✓ Complete
                          </span>
                        </div>
                        <span className={styles.shiftRowArrow}>→</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {/* Full rotation schedule */}
          {rotationShifts.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>The rotation</h2>
                <span className={styles.itemCount}>
                  Next {rotationShifts.length}{" "}
                  {rotationShifts.length === 1 ? "shift" : "shifts"}
                </span>
              </div>

              <p className={styles.listContext}>
                {rotationIntervalLabel} per person · {helpersInRotation}{" "}
                {helpersInRotation === 1 ? "helper" : "helpers"} in rotation
              </p>

              <div className={styles.rotationList}>
                {rotationShifts.map((s) => {
                  const isMine = s.assignedUser?.id === currentUserId;
                  return (
                    <div
                      key={s.id}
                      className={`${styles.rotationRow} ${isMine ? styles.rotationRowMine : ""}`}
                    >
                      <div className={styles.rotationDate}>
                        <span className={styles.rotationDateMain}>
                          {formatShiftDate(new Date(s.scheduledDate))}
                        </span>
                        <span className={styles.rotationDateFull}>
                          {formatShiftFullDate(new Date(s.scheduledDate))}
                        </span>
                      </div>
                      <div className={styles.rotationHelper}>
                        {s.assignedUser ? (
                          <>
                            <span className={styles.rotationHelperName}>
                              {s.assignedUser.firstName}{" "}
                              {s.assignedUser.lastName}
                            </span>
                            {isMine && (
                              <span className={styles.rotationMinePill}>
                                You
                              </span>
                            )}
                          </>
                        ) : (
                          <span className={styles.rotationUnassigned}>
                            Not yet assigned
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Share link — admin only */}
          {joinUrl && isAdmin && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Invite helpers</h2>
              </div>
              <p className={styles.listContext}>
                Share this link in your group chat. Anyone who taps it can sign
                up and join the rotation.
              </p>
              <div className={styles.shareBox}>
                <code className={styles.shareUrl}>{joinUrl}</code>
                <button
                  type='button'
                  className={styles.copyBtn}
                  onClick={copyJoinLink}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </section>
          )}

          {/* Recipient */}
          {recipient && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Recipient</h2>
              </div>
              <div className={styles.infoCard}>
                <div className={styles.infoRow}>
                  <span className={styles.fieldLabel}>Name</span>
                  <p className={styles.infoValue}>
                    {recipient.firstName} {recipient.lastName}
                  </p>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.fieldLabel}>Email</span>
                  <p className={styles.infoValue}>{recipient.email}</p>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.fieldLabel}>Phone number</span>
                  <a
                    href={`tel:${recipient.phone}`}
                    className={styles.infoValueLink}
                  >
                    {formatPhone(recipient.phone)}
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* Helpers */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                Helpers ({helpers.length})
              </h2>
            </div>
            {helpers.length === 0 ? (
              <p className={styles.emptyText}>
                No helpers yet. Share the link above to invite people.
              </p>
            ) : (
              <div className={styles.helperList}>
                {helpers.map((m) => {
                  const isSelf = m.user.id === currentUserId;
                  const nextShiftDate = nextShiftByHelper[m.user.id];
                  return (
                    <div
                      key={m.id}
                      className={`${styles.helperCard} ${isSelf ? styles.helperCardSelf : ""}`}
                    >
                      {isSelf && (
                        <span className={styles.selfPill}>This is you</span>
                      )}
                      <p className={styles.helperName}>
                        {m.user.firstName} {m.user.lastName}
                      </p>
                      <div className={styles.helperBadges}>
                        <span className={styles.roleBadge}>{m.role}</span>
                        {m.inRotation && (
                          <span className={styles.rotationBadge}>
                            In rotation
                          </span>
                        )}
                      </div>
                      <a
                        href={`tel:${m.user.phone}`}
                        className={styles.helperPhone}
                      >
                        {formatPhone(m.user.phone)}
                      </a>
                      <p className={styles.helperEmail}>{m.user.email}</p>

                      {m.inRotation && (
                        <div className={styles.helperRotation}>
                          <p className={styles.helperRotationLabel}>
                            {rotationIntervalLabel}
                          </p>
                          {nextShiftDate && (
                            <p className={styles.helperRotationNext}>
                              Next:{" "}
                              {formatShiftFullDate(new Date(nextShiftDate))}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Danger zone */}
          {isAdmin && (
            <section className={styles.dangerSection}>
              <h2 className={styles.dangerTitle}>Danger zone</h2>
              <DeleteCircleButton
                circleId={circle.id}
                circleName={circle.name}
              />
            </section>
          )}
        </LayoutWrapper>
      </div>
    </section>
  );
}
