import type { ReactNode } from "react";
import styles from "./ResultsPanel.module.css";

interface ResultsPanelProps {
  title: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function ResultsPanel({ title, headerRight, children, className }: ResultsPanelProps) {
  return (
    <div className={className ? `${styles.panel} ${className}` : styles.panel}>
      <div className={styles.header}>
        <h2>{title}</h2>
        {headerRight}
      </div>
      {children}
    </div>
  );
}
