"use client";

import styles from "./PageIntro.module.css";
import LayoutWrapper from "../LayoutWrapper";
import SectionHeading from "../SectionHeading/SectionHeading";

interface Props {
  title: string;
  title2?: string;
  copy?: string;
  sectionHeading: string;
}

export default function PageIntro({
  sectionHeading,
  title,
  title2,
  copy,
}: Props) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.parent}>
          <div className={styles.content}>
            <div className={styles.left}>
              <div className={styles.sectionHeaderContainer}>
                <SectionHeading
                  title={sectionHeading}
                  color='green'
                  dotColor='greenDot'
                />
              </div>
              <h1 className={styles.heading}>
                {title} <br />
                <span className={styles.headingii}>{title2}</span>
              </h1>
              <p className={styles.copy}>{copy}</p>
            </div>
            <div className={styles.right}>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
