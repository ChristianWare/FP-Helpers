"use client";

import styles from "./PageIntro.module.css";
import LayoutWrapper from "../LayoutWrapper";
import SectionHeading from "../SectionHeading/SectionHeading";
import Button from "../Button/Button";

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
              <div className={styles.btnContainer}>
                <Button
                  href='/create-circle'
                  text='Create a Circle or Meal Train'
                  btnType='white'
                />
                <Button
                  href='/find'
                  text='Find a Circle or Meal Train'
                  btnType='secondary'
                />
               
              </div>
            </div>
            <div className={styles.right}></div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
