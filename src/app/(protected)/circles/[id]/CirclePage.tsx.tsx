// app/(protected)/circles/[id]/CirclePage.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./CirclePage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import { formatPhone } from "@/lib/format";
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
  currentUserRole: string | null;
  joinUrl: string | null;
  justCreated: boolean;
};

export default function CirclePage({
  circle,
  recipient,
  memberships,
  currentUserRole,
  joinUrl,
  justCreated,
}: Props) {
  const [copied, setCopied] = useState(false);

  const helpers = memberships.filter((m) => m.role !== "RECIPIENT");
  const isAdmin = currentUserRole === "ADMIN";

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

            {/* Share link section */}
            {joinUrl && isAdmin && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Invite your helpers</h2>
                <p className={styles.sectionSubtitle}>
                  Share this link in your group chat. Anyone who taps it can
                  sign up and join the rotation.
                </p>

                {/* <div className={styles.sectionCard}> */}
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
                {/* </div> */}
              </section>
            )}

            {/* Schedule info */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Schedule</h2>
              <div className={styles.sectionCard}>
                <div>
                  <span className={styles.fieldLabel}>Day</span>
                  <p className={styles.fieldValue}>
                    {DAYS_OF_WEEK[circle.rotationDayOfWeek]}
                    {circle.rotationCadence === "BIWEEKLY"
                      ? " (every other week)"
                      : ""}
                  </p>
                </div>

                {circle.typicalArrivalTime && (
                  <div>
                    <span className={styles.fieldLabel}>Arrival time</span>
                    <p className={styles.fieldValue}>
                      {circle.typicalArrivalTime}
                    </p>
                  </div>
                )}

                {circle.address && (
                  <div>
                    <span className={styles.fieldLabel}>Address</span>
                    <p className={styles.fieldValue}>{circle.address}</p>
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
                  {helpers.map((m) => (
                    <div key={m.id} className={styles.sectionCard}>
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
                        <span className={styles.fieldLabel}>Phone number</span>
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
                    </div>
                  ))}
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
