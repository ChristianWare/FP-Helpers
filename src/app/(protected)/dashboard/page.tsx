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
import {
  describeDaysShort,
  getCircleDays,
  shiftDayCutoff,
} from "@/lib/shifts/scheduleDates";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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

  // Someone whose ONLY role is "the person being helped" gets their own
  // simpler page. But people are often both — last month's helper is this
  // month's meal train recipient — and they keep their dashboard. (This used
  // to redirect anyone with any recipient membership, forever, which locked
  // them out of every circle they help in.)
  const helpsSomewhere = memberships.some((m) => m.role !== "RECIPIENT");
  const receivingNow = memberships.some(
    (m) => m.role === "RECIPIENT" && m.circle.status !== "ARCHIVED",
  );
  if (receivingNow && !helpsSomewhere) {
    redirect("/my-circle");
  }

  const circleIds = memberships.map((m) => m.circleId);
  const cutoff = shiftDayCutoff();

  const upcomingShifts =
    circleIds.length > 0
      ? await db.shift.findMany({
          where: {
            circleId: { in: circleIds },
            scheduledDate: { gt: cutoff },
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

  const nextShiftByCircle = new Map<string, (typeof upcomingShifts)[number]>();
  const myNextShiftByCircle = new Map<
    string,
    (typeof upcomingShifts)[number]
  >();

  // Meal trains: how many upcoming days nobody has claimed yet
  const openDaysByCircle = new Map<string, number>();

  for (const shift of upcomingShifts) {
    if (!shift.assignedUserId) {
      openDaysByCircle.set(
        shift.circleId,
        (openDaysByCircle.get(shift.circleId) ?? 0) + 1,
      );
      // An unclaimed day isn't anyone's "next shift"
      continue;
    }
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
              <h2 className={styles.emptyTitle}>
                {"You're not part of a circle yet"}
              </h2>
              <p className={styles.emptyText}>
                Join a meal train or care circle that&apos;s already going in
                the congregation — or start a new one for someone who needs a
                hand.
              </p>
              <div className={styles.emptyActions}>
                <Link href='/find' className={styles.findBtn}>
                  Find a circle to join
                </Link>
                <Link href='/create-circle' className={styles.createBtn}>
                  + Create a new circle
                </Link>
              </div>
              <p className={styles.emptyHint}>
                Got an invite link from a group chat? Just tap it — it brings
                you straight in.
              </p>
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
                  const isMealTrain = m.circle.circleType === "MEAL_TRAIN";
                  const isRecipientHere = m.role === "RECIPIENT";
                  const openDays = openDaysByCircle.get(m.circle.id) ?? 0;

                  return (
                    <div
                      key={m.circle.id}
                      className={`${styles.circleCard} ${isArchived ? styles.circleCardArchived : ""}`}
                    >
                      <div className={styles.cardBody}>
                        {/* What kind of circle this is — the first thing on
                            the card, so a mixed dashboard reads at a glance */}
                        <span
                          className={`${styles.typeBadge} ${isMealTrain ? styles.typeBadgeMealTrain : styles.typeBadgeStandard}`}
                        >
                          {isMealTrain ? "Meal train" : "Standard circle"}
                        </span>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.circleName}>{m.circle.name}</h3>
                          <span className={styles.roleBadge}>
                            {isArchived
                              ? "ARCHIVED"
                              : isRecipientHere
                                ? "FOR YOU"
                                : m.role}
                          </span>
                        </div>
                        <div className={styles.cardRecipient}>
                          <p className={styles.recipientLabel}>
                            {isMealTrain ? "Meals for" : "Recipient"}
                          </p>
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
                            <span className={styles.detailLabel}>
                              {isMealTrain ? "Meal days" : "Days"}
                            </span>
                            <span className={styles.detailValue}>
                              {describeDaysShort(getCircleDays(m.circle))}
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
                        <Link
                          href={
                            isRecipientHere
                              ? `/my-circle?circle=${m.circle.id}`
                              : `/circles/${m.circle.id}`
                          }
                          className={styles.profileLink}
                        >
                          {isRecipientHere ? "Open my page" : "More Details"}
                        </Link>
                      </div>

                      {myNextShift && !isArchived && (
                        <Link
                          href={`/circles/${m.circle.id}/shifts/${myNextShift.id}`}
                          className={styles.shiftLinkMine}
                        >
                          <div className={styles.shiftLinkContent}>
                            <span className={styles.shiftLinkLabel}>
                              {isMealTrain
                                ? "Your next meal"
                                : isMineNext
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

                      {isMealTrain &&
                        !isArchived &&
                        !isRecipientHere &&
                        openDays > 0 && (
                          <Link
                            href={`/circles/${m.circle.id}`}
                            className={styles.shiftInfo}
                          >
                            <span className={styles.shiftInfoLabel}>
                              Still open
                            </span>
                            <span className={styles.shiftInfoValue}>
                              {openDays} {openDays === 1 ? "day" : "days"} ·
                              pick one
                            </span>
                          </Link>
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
