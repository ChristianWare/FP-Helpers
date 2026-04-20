import styles from "./SectionHeading.module.css";

interface Props {
  title: string ;
  color: string;
  dotColor: string;
}

const SectionHeading = ({ title, color = "", dotColor = "" }: Props) => {
  return (
    <div className={styles.top}>
      <div className={`${styles.circle} ${styles[dotColor]}`}></div>
      <span className={`${styles.span} ${styles[color]}`}> {title}</span>
    </div>
  );
};

export default SectionHeading;
