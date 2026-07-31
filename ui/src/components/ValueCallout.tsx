import type { ReactNode } from "react";
import styles from "./ValueCallout.module.css";

interface ValueCalloutProps {
  children: ReactNode;
}

export default function ValueCallout({ children }: ValueCalloutProps) {
  return (
    <div className={styles.callout}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7c.5.4.9 1 .9 1.7v.6h6.2v-.6c0-.7.4-1.3.9-1.7A7 7 0 0 0 12 2Z" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
