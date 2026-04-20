"use client";

import ContentPadding from "../ContentPadding/ContentPadding";
import styles from "./LayoutWrapper.module.css";

interface Props {
  color?: string;
  children: React.ReactNode;
}

const LayoutWrapper = ({ children, color = "" }: Props) => {
  return (
    <div className={`${styles.layout} ${styles[color]}`}>
      <ContentPadding>{children}</ContentPadding>
    </div>
  );
};
export default LayoutWrapper;
