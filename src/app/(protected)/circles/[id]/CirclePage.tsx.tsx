// app/(protected)/circles/[id]/CirclePage.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./CirclePage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
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

  const copyJoinLink = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <LayoutWrapper>
          <div className={styles.wrapper}>
            <header className={styles.header}>
              <Link href='/dashboard' className={styles.backLink}>
                ← Dashboard
              </Link>
              <h1 className={styles.title}>{circle.name}</h1>
              {recipient && (
                <p className={styles.subtitle}>
                  Helping {recipient.firstName} {recipient.lastName}
                </p>
              )}
            </header>

            {justCreated && (
              <>
                <Confetti />
                <div className={styles.successBanner}>
                  <div className={styles.successIcon}>🎉</div>
                  <div>
                    <h2 className={styles.successTitle}>
                      Your circle is ready
                    </h2>
                    <p className={styles.successText}>
                      We&apos;ve sent {recipient?.firstName} their sign-in
                      details by email. Now invite your friends by sharing the
                      link below.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Your shifts — only shown if the user has any */}
            {(myUpcomingShifts.length > 0 || myRecentShifts.length > 0) && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Your shifts</h2>

                {myUpcomingShifts.length > 0 && (
                  <>
                    <p className={styles.shiftsGroupLabel}>Upcoming</p>
                    <div className={styles.shiftsList}>
                      {myUpcomingShifts.map((s) => (
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
                    <p className={styles.shiftsGroupLabel}>
                      Recently completed
                    </p>
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

            {/* Share link section */}
            {joinUrl && isAdmin && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Invite your helpers</h2>
                <p className={styles.sectionSubtitle}>
                  Share this link in your group chat. Anyone who taps it can
                  sign up and join the rotation.
                </p>

                <div>
                  <span className={styles.fieldLabel}>Shareable link</span>
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
                </div>
              </section>
            )}

            {/* Schedule info */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Schedule</h2>
              <div className={styles.sectionCard}>
                <div>
                  <span className={styles.fieldLabel}>Day</span>
                  <p className={styles.memberName}>
                    {DAYS_OF_WEEK[circle.rotationDayOfWeek]}
                    {circle.rotationCadence === "BIWEEKLY"
                      ? " (every other week)"
                      : ""}
                  </p>
                </div>

                {circle.typicalArrivalTime && (
                  <div>
                    <span className={styles.fieldLabel}>Arrival time</span>
                    <p className={styles.memberName}>
                      {circle.typicalArrivalTime}
                    </p>
                  </div>
                )}

                {circle.address && (
                  <div>
                    <span className={styles.fieldLabel}>Address</span>
                    <p className={styles.memberName}>{circle.address}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Recipient */}
            {recipient && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Recipient</h2>
                <div className={styles.sectionCard}>
                  <div>
                    <span className={styles.fieldLabel}>Name</span>
                    <p className={styles.memberName}>
                      {recipient.firstName} {recipient.lastName}
                    </p>
                  </div>
                  <div>
                    <span className={styles.fieldLabel}>Email</span>
                    <p className={styles.memberContact}>{recipient.email}</p>
                  </div>
                  <div>
                    <span className={styles.fieldLabel}>Phone number</span>
                    <p className={styles.memberContact}>
                      {formatPhone(recipient.phone)}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Helpers / members */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Helpers ({helpers.length})
              </h2>
              {helpers.length === 0 ? (
                <p className={styles.emptyText}>
                  No helpers yet. Share the link above to invite people.
                </p>
              ) : (
                <div className={styles.memberList}>
                  {helpers.map((m) => {
                    const isSelf = m.user.id === currentUserId;
                    const nextShiftDate = nextShiftByHelper[m.user.id];
                    return (
                      <div
                        key={m.id}
                        className={`${styles.sectionCard} ${isSelf ? styles.sectionCardSelf : ""}`}
                      >
                        <div>
                          <span className={styles.fieldLabel}>Name</span>
                          <p className={styles.memberName}>
                            {m.user.firstName} {m.user.lastName}
                          </p>
                        </div>
                        <div>
                          <span className={styles.fieldLabel}>Email</span>
                          <p className={styles.memberContact}>{m.user.email}</p>
                        </div>
                        <div>
                          <span className={styles.fieldLabel}>
                            Phone number
                          </span>
                          <p className={styles.memberContact}>
                            {formatPhone(m.user.phone)}
                          </p>
                        </div>
                        <div>
                          <span className={styles.fieldLabel}>Role</span>
                          <div className={styles.memberMeta}>
                            <span className={styles.roleBadge}>{m.role}</span>
                            {m.inRotation && (
                              <span className={styles.rotationBadge}>
                                In rotation
                              </span>
                            )}
                          </div>
                        </div>

                        {m.inRotation && (
                          <div>
                            <span className={styles.fieldLabel}>Rotation</span>
                            <p className={styles.memberName}>
                              {rotationIntervalLabel}
                            </p>
                            {nextShiftDate && (
                              <p className={styles.memberContactSmall}>
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

            {/* Danger zone — admin only */}
            {isAdmin && (
              <section className={styles.dangerSection}>
                <h2 className={styles.dangerTitle}>Danger zone</h2>
                <DeleteCircleButton
                  circleId={circle.id}
                  circleName={circle.name}
                />
              </section>
            )}
          </div>
        </LayoutWrapper>
      </div>
    </div>
  );
}
