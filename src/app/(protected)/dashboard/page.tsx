// app/(protected)/dashboard/page.tsx
import { auth, signOut } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import styles from "./DashboardPage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";
import { formatPhone } from "@/lib/format";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
          memberships: {
            where: { active: true, role: { not: "RECIPIENT" } },
            select: { id: true },
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

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <LayoutWrapper>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Hi {session.user.firstName} 👋</h1>
              <p className={styles.subtitle}>
                {memberships.length === 0
                  ? "Let's get you started."
                  : `You're part of ${memberships.length} ${memberships.length === 1 ? "circle" : "circles"}.`}
              </p>
            </div>
            <div className={styles.accountInfo}>
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
              <p className={styles.userEmail}>{session.user.email}</p>
            </div>
          </header>

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

                  return (
                    <Link
                      key={m.circle.id}
                      href={`/circles/${m.circle.id}`}
                      className={styles.circleCard}
                    >
                      <div className={styles.cardHeader}>
                        <h3 className={styles.circleName}>{m.circle.name}</h3>
                        <span className={styles.roleBadge}>{m.role}</span>
                      </div>  

                      <div className={styles.cardRecipient}>
                        {/* <p className={styles.recipientLabel}>Recipient</p> */}
                        <p className={styles.recipientName}>{recipientName}</p>
                        {r && (
                          <>
                            <p className={styles.recipientContact}>
                              {formatPhone(r.phone)}
                            </p>
                            <p className={styles.recipientContact}>{r.email}</p>
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
                          <span className={styles.detailLabel}>Frequency</span>
                          <span className={styles.detailValue}>
                            {m.circle.rotationCadence === "BIWEEKLY"
                              ? "Biweekly"
                              : "Weekly"}
                          </span>
                        </div>
                      </div>
                    </Link>
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
