import styles from "./FirstStep.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
const data = [
  {
    id: 14,
    title: "Organize a circle",
    desc: "Create a circle and invite your friends to join. You can also join existing circles.",
  },
  {
    id: 1,
    title: "Find a Circle",
    desc: "Search for circles in your area and join one that fits your needs.",
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
