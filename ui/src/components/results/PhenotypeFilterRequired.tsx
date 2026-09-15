import { PlusIcon } from "../icons";
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
        <PlusIcon size={12} strokeWidth={2.5} />
        {buttonLabel}
      </button>
    </div>
  );
}
