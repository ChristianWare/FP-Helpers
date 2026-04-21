import Link from "next/link";
import styles from "./Logo.module.css";

interface Props {
  color?: string;
}

const Logo = ({ color = "" }: Props) => {
  return (
    <Link href='/' className={`${styles.logo} ${styles[color]}`}>
      FP - Helpers
    </Link>
  );
};
export default Logo;
