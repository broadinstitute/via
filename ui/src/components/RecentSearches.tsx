import { useNavigate } from "react-router-dom";
import styles from "./RecentSearches.module.css";

interface RecentSearch {
  id: string;
  variantsSummary: string;
  hpoTerm: string | null;
  hpoDescription: string | null;
  searchedAt: string;
}

const RECENT_SEARCHES: RecentSearch[] = [
  {
    id: "1",
    variantsSummary: "21 variants (GATA4)",
    hpoTerm: "HP:0001636",
    hpoDescription: "Tetralogy of Fallot",
    searchedAt: "2 hours ago",
  },
  {
    id: "2",
    variantsSummary: "8 variants (BRCA1)",
    hpoTerm: "HP:0003002",
    hpoDescription: "Breast carcinoma",
    searchedAt: "Yesterday",
  },
  {
    id: "3",
    variantsSummary: "3 variants (TTN)",
    hpoTerm: null,
    hpoDescription: null,
    searchedAt: "3 days ago",
  },
  {
    id: "4",
    variantsSummary: "45 variants (CFTR)",
    hpoTerm: "HP:0006528",
    hpoDescription: "Chronic bronchitis",
    searchedAt: "1 week ago",
  },
];

export default function RecentSearches() {
  const navigate = useNavigate();

  return (
    <section className={styles.panel}>
      <h2 className={styles.heading}>Recent searches</h2>
      <ul className={styles.list}>
        {RECENT_SEARCHES.map((search) => (
          <li key={search.id} className={styles.item}>
            <div className={styles.details}>
              <span className={styles.variants}>{search.variantsSummary}</span>
              <span className={styles.dotSeparator} aria-hidden="true">
                ·
              </span>
              {search.hpoTerm ? (
                <span className={styles.phenotype}>
                  <span className={styles.hpoCode}>{search.hpoTerm}</span> {search.hpoDescription}
                </span>
              ) : (
                <span className={styles.noPhenotype}>No phenotype</span>
              )}
              <span className={styles.timestamp}>{search.searchedAt}</span>
            </div>
            <button type="button" className={styles.viewBtn} onClick={() => navigate("/results")}>
              View results
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
