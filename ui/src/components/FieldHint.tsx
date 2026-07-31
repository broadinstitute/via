import type { ReactNode } from "react";
import styles from "./FieldHint.module.css";

interface FieldHintProps {
  children: ReactNode;
}

export default function FieldHint({ children }: FieldHintProps) {
  return <p className={styles.hint}>{children}</p>;
}
