// app/(auth)/check-email/page.tsx
import Link from "next/link";
import styles from "./CheckEmailPage.module.css";

export default function CheckEmailPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>✉️</div>
        <h1 className={styles.heading}>Check your email</h1>
        <p className={styles.text}>
          We sent you a sign-in link. Open your email and tap the link to sign
          in.
        </p>
        <p className={styles.hint}>
          The link is valid for 1 hour. It may take a minute to arrive — check
          your spam folder if you don&apos;t see it.
        </p>
        <Link href='/login' className={styles.backLink}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
