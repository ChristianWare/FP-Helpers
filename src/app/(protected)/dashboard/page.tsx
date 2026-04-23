// app/(protected)/dashboard/page.tsx
import styles from "./DashboardPage.module.css";
import { auth, signOut } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";
import { formatPhone } from "@/lib/format";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { formatShiftDate } from "@/lib/shifts/formatShift";
import { formatCircleDuration } from "@/lib/circles/formatDuration";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const recipientMembership = await db.circleMembership.findFirst({
    where: {
      userId: session.user.id,
      role: "RECIPIENT",
      active: true,
    },
  });

  if (recipientMembership) {
    redirect("/my-circle");
  }

  const memberships = await db.circleMembership.findMany({
    where: { userId: session.user.id, active: true },
    include: {
      circle: {
        include: {
          recipient: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          _count: {
            select: {
              memberships: {
                where: { active: true, role: { not: "RECIPIENT" } },
              },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const circleIds = memberships.map((m) => m.circleId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingShifts =
    circleIds.length > 0
      ? await db.shift.findMany({
          where: {
            circleId: { in: circleIds },
            scheduledDate: { gte: today },
            status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          },
          include: {
            assignedUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { scheduledDate: "asc" },
        })
      : [];

  const nextShiftByCircle = new Map<
    string,
    (typeof upcomingShifts)[number]
  >();
  const myNextShiftByCircle = new Map<
    string,
    (typeof upcomingShifts)[number]
  >();

  for (const shift of upcomingShifts) {
    if (!nextShiftByCircle.has(shift.circleId)) {
      nextShiftByCircle.set(shift.circleId, shift);
    }
    if (
      shift.assignedUserId === session.user.id &&
      !myNextShiftByCircle.has(shift.circleId)
    ) {
      myNextShiftByCircle.set(shift.circleId, shift);
    }
  }

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <LayoutWrapper>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Hi {session.user.firstName}</h1>
            </div>
            <div className={styles.accountInfo}>
              <div className={styles.accountActions}>
                <Link href='/profile' className={styles.profileLink}>
                  Profile
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button type='submit' className={styles.signOutBtn}>
                    Sign out
                  </button>
                </form>
              </div>
              <p className={styles.userEmail}>{session.user.email}</p>
            </div>
          </header>
          <div className={styles.subtitle}>
            <SectionHeading
              title={
                memberships.length === 0
                  ? "Let's get you started."
                  : `You're part of ${memberships.length} ${memberships.length === 1 ? "circle" : "circles"}.`
              }
              color='black'
              dotColor='purpleDot'
            />
          </div>
          {memberships.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🤝</div>
              <h2 className={styles.emptyHeading}>
                You haven&apos;t created any circles yet
              </h2>
              <p className={styles.emptyText}>
                Create your first care circle to start coordinating help for
                someone in the congregation.
              </p>
              <Button
                href='/create-circle'
                text='+ Create your first circle'
                btnType='primaryii'
              />
            </div>
          ) : (
            <>
              <div className={styles.circleGrid}>
                {memberships.map((m) => {
                  const r = m.circle.recipient;
                  const recipientName = r
                    ? `${r.firstName} ${r.lastName}`
                    : "—";
                  const helperCount = m.circle._count.memberships;

                  const circleNextShift = nextShiftByCircle.get(m.circle.id);
                  const myNextShift = myNextShiftByCircle.get(m.circle.id);
                  const isMineNext =
                    circleNextShift?.assignedUserId === session.user.id;

                  const durationLabel = formatCircleDuration({
                    durationType: m.circle.durationType,
                    startDate: m.circle.startDate,
                    endDate: m.circle.endDate,
                  });

                  const isArchived = m.circle.status === "ARCHIVED";

                  return (
                    <div
                      key={m.circle.id}
                      className={`${styles.circleCard} ${isArchived ? styles.circleCardArchived : ""}`}
                    >
                      <Link
                        href={`/circles/${m.circle.id}`}
                        className={styles.cardBody}
                      >
                        <div className={styles.cardHeader}>
                          <h3 className={styles.circleName}>
                            {m.circle.name}
                          </h3>
                          <span className={styles.roleBadge}>
                            {isArchived ? "ARCHIVED" : m.role}
                          </span>
                        </div>

                        <div className={styles.cardRecipient}>
                          <p className={styles.recipientLabel}>Recipient</p>
                          <p className={styles.recipientName}>
                            {recipientName}
                          </p>
                          {r && (
                            <>
                              <p className={styles.recipientContact}>
                                {formatPhone(r.phone)}
                              </p>
                              <p className={styles.recipientContact}>
                                {r.email}
                              </p>
                            </>
                          )}
                        </div>

                        <div className={styles.cardDetails}>
                          <div className={styles.cardDetail}>
                            <span className={styles.detailLabel}>Helpers</span>
                            <span className={styles.detailValue}>
                              {helperCount}
                            </span>
                          </div>
                          <div className={styles.cardDetail}>
                            <span className={styles.detailLabel}>Day</span>
                            <span className={styles.detailValue}>
                              {DAYS_OF_WEEK[m.circle.rotationDayOfWeek]}
                            </span>
                          </div>
                          <div className={styles.cardDetail}>
                            <span className={styles.detailLabel}>
                              {m.circle.rotationCadence === "BIWEEKLY"
                                ? "Biweekly"
                                : "Weekly"}
                            </span>
                            <span
                              className={`${styles.detailValue} ${styles.detailValueDuration}`}
                            >
                              {durationLabel}
                            </span>
                          </div>
                        </div>
                      </Link>

                      {myNextShift && !isArchived && (
                        <Link
                          href={`/circles/${m.circle.id}/shifts/${myNextShift.id}`}
                          className={styles.shiftLinkMine}
                        >
                          <div className={styles.shiftLinkContent}>
                            <span className={styles.shiftLinkLabel}>
                              {isMineNext
                                ? "Your next shift"
                                : "Your upcoming shift"}
                            </span>
                            <span className={styles.shiftLinkDate}>
                              {formatShiftDate(
                                new Date(myNextShift.scheduledDate),
                              )}
                            </span>
                          </div>
                          <span className={styles.shiftLinkArrow}>→</span>
                        </Link>
                      )}

                      {circleNextShift &&
                        !isMineNext &&
                        !isArchived &&
                        circleNextShift.assignedUser && (
                          <div className={styles.shiftInfo}>
                            <span className={styles.shiftInfoLabel}>
                              Next up
                            </span>
                            <span className={styles.shiftInfoValue}>
                              {circleNextShift.assignedUser.firstName} ·{" "}
                              {formatShiftDate(
                                new Date(circleNextShift.scheduledDate),
                              )}
                            </span>
                          </div>
                        )}

                      {isArchived && (
                        <div className={styles.archivedFooter}>
                          <span className={styles.archivedIcon}>✓</span>
                          <span className={styles.archivedText}>
                            This circle has finished
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className={styles.createMore}>
                <Button
                  href='/create-circle'
                  text='Create another circle'
                  btnType='secondary'
                />
              </div>
            </>
          )}
        </LayoutWrapper>
      </div>
    </section>
  );
}