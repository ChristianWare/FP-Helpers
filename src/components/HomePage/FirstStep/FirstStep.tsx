import styles from "./FirstStep.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
const data = [
  {
    id: 14,
    title: "Create a circle",
    desc: "Create a circle and invite your friends to join. You can also join existing circles.",
  },
  {
    id: 1,
    title: "Login",
    desc: "Login with your Google account to get started. We use Google for authentication and do not store any of your data.",
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
                <div className={styles.card} key={x.id}>
                  <h3 className={styles.title}>{x.title}</h3>
                  <p className={styles.desc}>{x.desc}</p>
                </div>
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
