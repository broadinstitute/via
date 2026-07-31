import styles from "./SearchDrawer.module.css";

interface SearchDrawerProps {
  open: boolean;
  variantsText: string;
  hpoText: string;
  variantsLimit: number;
  onVariantsChange: (value: string) => void;
  onHpoChange: (value: string) => void;
  onCancel: () => void;
  onSearch: () => void;
}

export default function SearchDrawer({
  open,
  variantsText,
  hpoText,
  variantsLimit,
  onVariantsChange,
  onHpoChange,
  onCancel,
  onSearch,
}: SearchDrawerProps) {
  const enteredCount = variantsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;

  return (
    <div className={open ? `${styles.drawer} ${styles.open}` : styles.drawer}>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="drawerVariants">Candidate genes or variants (limit {variantsLimit})</label>
          <textarea
            id="drawerVariants"
            rows={10}
            value={variantsText}
            onChange={(event) => onVariantsChange(event.target.value)}
          />
          <div className={styles.hint}>
            {enteredCount} of {variantsLimit} candidate variants entered
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="drawerHpo">Phenotype (HPO term — limit 1)</label>
          <input id="drawerHpo" type="text" value={hpoText} onChange={(event) => onHpoChange(event.target.value)} />
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={styles.primary} onClick={onSearch}>
          Search
        </button>
      </div>
    </div>
  );
}
