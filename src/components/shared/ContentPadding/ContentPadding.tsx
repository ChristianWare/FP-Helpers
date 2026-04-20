import React from "react";
import styles from "./ContentPadding.module.css";

interface PaddingProps {
  children: React.ReactNode;
  paddingBottom?: string
}

const ContentPadding = ({ children, paddingBottom='' }: PaddingProps) => {
  return (
    <div className={`${styles.container} ${styles[paddingBottom]}`}>
      {children}
    </div>
  );
};
export default ContentPadding;
