// app/(protected)/dashboard/page.tsx
import { auth, signOut } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import styles from "./DashboardPage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fetch circles the user is a member of
  const memberships = await db.circleMembership.findMany({
    where: { userId: session.user.id, active: true },
    include: {
      circle: {
        include: {
          recipient: {
            select: { firstName: true, lastName: true },
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
                  const recipientName = m.circle.recipient
                    ? `${m.circle.recipient.firstName} ${m.circle.recipient.lastName}`
                    : "—";
                  return (
                    <Link
                      key={m.circle.id}
                      href={`/circles/${m.circle.id}`}
                      className={styles.circleCard}
                    >
                      <div className={styles.cardTop}>
                        <span className={styles.roleBadge}>{m.role}</span>
                      </div>
                      <h3 className={styles.circleName}>{m.circle.name}</h3>
                      <p className={styles.recipientName}>
                        Helping {recipientName}
                      </p>
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
