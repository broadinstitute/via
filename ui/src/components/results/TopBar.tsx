import styles from "./TopBar.module.css";

interface TopBarProps {
  loading?: boolean;
  variantsEnteredCount?: number;
  hpoTerm?: string;
  userEmail: string;
  onModifySearch?: () => void;
}

export default function TopBar({ loading, variantsEnteredCount, hpoTerm, userEmail, onModifySearch }: TopBarProps) {
  return (
    <div className={styles.topbar}>
      {onModifySearch && (
        <div className={styles.caseInfo}>
          <span className={styles.searchLead}>Search terms</span>
          <span className={styles.searchField}>
            Candidate variants{" "}
            {loading ? (
              <span className={styles.skeletonBadge} />
            ) : (
              <span className={styles.valueBadge}>{variantsEnteredCount} entered</span>
            )}
          </span>
          <span className={styles.searchField}>
            Phenotype{" "}
            {loading ? (
              <span className={styles.skeletonBadge} />
            ) : (
              <span className={`${styles.valueBadge} ${styles.monoVal}`}>{hpoTerm}</span>
            )}
          </span>
          <button type="button" className={styles.editBtn} onClick={onModifySearch} disabled={loading}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Modify search
          </button>
        </div>
      )}
      <div className={styles.user}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
        {userEmail}
      </div>
    </div>
  );
}
