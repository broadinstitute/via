import type { ReactNode } from "react";
import styles from "./Tag.module.css";

export type TagVariant = "path" | "likely-path" | "vus" | "likely-benign" | "benign";

interface TagProps {
  variant: TagVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASS: Record<TagProps["variant"], string> = {
  path: styles.path,
  "likely-path": styles["likely-path"],
  vus: styles.vus,
  "likely-benign": styles["likely-benign"],
  benign: styles.benign,
};

export default function Tag({ variant, children, className }: TagProps) {
  const classes = [styles.tag, VARIANT_CLASS[variant], className].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}
