import styles from "./FirstStep.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Link from "next/link";

const data = [
  {
    id: 14,
    title: "Organize a circle",
    desc: "Create a circle and invite your friends to join. You can also join existing circles.",
    href: "/create-circle",
  },
  {
    id: 1,
    title: "Log Into dashboard",
    desc: "Log into your dashboard to manage your circles, view your progress, and access exclusive resources.",
    href: "/login",
  },
];

const FirstStep = () => {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <h2 className={styles.heading}>
              Ready to <br />
              <span className={styles.span}> get started? </span>
            </h2>
          </div>
          <div className={styles.bottom}>
            <div className={styles.bottomMap}>
              {data.map((x) => (
                <Link href={x.href} className={styles.card} key={x.id}>
                  <h3 className={styles.title}>{x.title}</h3>
                  <p className={styles.desc}>{x.desc}</p>
                </Link>
              ))}
            </div>
          </div>
          <div className={styles.problemContainer}>
            {/* <div className={styles.pattern}></div> */}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
};
export default FirstStep;
