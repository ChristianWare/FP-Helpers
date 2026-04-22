// app/(protected)/circles/[id]/CirclePage.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./CirclePage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import { formatPhone } from "@/lib/format"; 

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
              <div className={styles.successBanner}>
                <div className={styles.successIcon}>🎉</div>
                <div>
                  <h2 className={styles.successTitle}>Your circle is ready</h2>
                  <p className={styles.successText}>
                    We&apos;ve sent {recipient?.firstName} a sign-in link by
                    email. Now invite your friends by sharing the link below.
                  </p>
                </div>
              </div>
            )}

            {/* Share link section */}
            {joinUrl && isAdmin && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Invite your helpers</h2>
                <p className={styles.sectionSubtitle}>
                  Share this link in your group chat. Anyone who taps it can
                  sign up and join the rotation.
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

            {/* Schedule info */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Schedule</h2>
              <dl className={styles.detailList}>
                <div className={styles.detailRow}>
                  <dt>Day</dt>
                  <dd>
                    {DAYS_OF_WEEK[circle.rotationDayOfWeek]}
                    {circle.rotationCadence === "BIWEEKLY"
                      ? " (every other week)"
                      : ""}
                  </dd>
                </div>
                {circle.typicalArrivalTime && (
                  <div className={styles.detailRow}>
                    <dt>Arrival time</dt>
                    <dd>{circle.typicalArrivalTime}</dd>
                  </div>
                )}
                {circle.address && (
                  <div className={styles.detailRow}>
                    <dt>Address</dt>
                    <dd>{circle.address}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Recipient */}
            {recipient && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Recipient</h2>
                <div className={styles.memberCard}>
                  <div className={styles.memberInfo}>
                    <p className={styles.memberName}>
                      {recipient.firstName} {recipient.lastName}
                    </p>
                    <p className={styles.memberContact}>
                      {recipient.email} · {formatPhone(recipient.phone)}
                    </p>
                  </div>
                  <span className={styles.roleBadge}>Recipient</span>
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
                    <div key={m.id} className={styles.memberCard}>
                      <div className={styles.memberInfo}>
                        <p className={styles.memberName}>
                          {m.user.firstName} {m.user.lastName}
                        </p>
                        <p className={styles.memberContact}>
                          {m.user.email} · {formatPhone(m.user.phone)}
                        </p>
                      </div>
                      <div className={styles.memberMeta}>
                        <span className={styles.roleBadge}>{m.role}</span>
                        {m.inRotation && (
                          <span className={styles.rotationBadge}>
                            In rotation
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </LayoutWrapper>
      </div>
    </div>
  );
}
