import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon, PencilIcon, SearchIcon, UserIcon } from "../icons";
import styles from "./TopBar.module.css";

interface TopBarProps {
  loading?: boolean;
  variantsEnteredCount?: number;
  hpoTerm?: string;
  userEmail: string;
  onModifySearch?: () => void;
}

export default function TopBar({ loading, variantsEnteredCount, hpoTerm, userEmail, onModifySearch }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.topbar}>
      {onModifySearch && (
        <div className={styles.caseInfo}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate("/")}
            aria-label="Back to search"
            title="Back to search"
          >
            <ArrowLeftIcon size={14} strokeWidth={2.5} />
          </button>
          <span className={styles.searchLead} role="img" aria-label="Search terms" title="Search terms">
            <SearchIcon size={14} strokeWidth={2.5} />
          </span>
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
              <span className={`${styles.valueBadge}`}>{hpoTerm || 'None entered'}</span>
            )}
          </span>
          <button type="button" className={styles.editBtn} onClick={onModifySearch} disabled={loading}>
            <PencilIcon size={11} strokeWidth={2.5} />
            Modify search
          </button>
        </div>
      )}
      <div className={styles.user}>
        <UserIcon size={16} />
        {userEmail}
      </div>
    </div>
  );
}
