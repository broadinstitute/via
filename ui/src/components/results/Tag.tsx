import type { ReactNode } from "react";
import styles from "./Tag.module.css";

interface TagProps {
  variant: "path" | "vus" | "benign";
  children: ReactNode;
}

const VARIANT_CLASS: Record<TagProps["variant"], string> = {
  path: styles.path,
  vus: styles.vus,
  benign: styles.benign,
};

export default function Tag({ variant, children }: TagProps) {
  return <span className={`${styles.tag} ${VARIANT_CLASS[variant]}`}>{children}</span>;
}
