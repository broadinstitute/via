import styles from "./PhenotypeFilterRequired.module.css";

interface PhenotypeFilterRequiredProps {
  message: string;
  buttonLabel: string;
  onAddPhenotypeFilter: () => void;
}

export default function PhenotypeFilterRequired({
  message,
  buttonLabel,
  onAddPhenotypeFilter,
}: PhenotypeFilterRequiredProps) {
  return (
    <div className={styles.body}>
      <span>{message}</span>
      <button type="button" className={styles.addBtn} onClick={onAddPhenotypeFilter}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {buttonLabel}
      </button>
    </div>
  );
}
