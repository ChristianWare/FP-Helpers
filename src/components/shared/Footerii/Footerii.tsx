import styles from "./Footerii.module.css";
import Logo from "../Logo/Logo";

export default function Footerii() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.container}>
      <div className={styles.parent}>
        <div className={styles.content}>
          <div className={styles.logoMobile}>
            <Logo />
          </div>
          <div className={styles.top}></div>
          <div className={styles.bottom}>
            <div className={styles.left}>
              <div className={styles.box}>
                <Logo />
              </div>
            </div>
            <div className={styles.right}>
              <small className={styles.small1}>
                © {currentYear} FP Helpers. All rights reserved.
              </small>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
