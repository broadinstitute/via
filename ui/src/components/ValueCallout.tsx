import type { ReactNode } from "react";
import { LightbulbIcon } from "./icons";
import styles from "./ValueCallout.module.css";

interface ValueCalloutProps {
  children: ReactNode;
}

export default function ValueCallout({ children }: ValueCalloutProps) {
  return (
    <div className={styles.callout}>
      <LightbulbIcon size={16} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
