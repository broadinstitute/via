import type { ReactNode } from "react";
import styles from "./StepPanel.module.css";

export type StepTagVariant = "limit" | "optional";

interface StepPanelProps {
  stepNumber: number;
  title: string;
  tag?: { label: string; variant: StepTagVariant };
  children: ReactNode;
}

export default function StepPanel({ stepNumber, title, tag, children }: StepPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.number}>{stepNumber}</div>
        <h2>{title}</h2>
        {tag && (
          <span className={tag.variant === "limit" ? styles.tagLimit : styles.tagOptional}>{tag.label}</span>
        )}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
