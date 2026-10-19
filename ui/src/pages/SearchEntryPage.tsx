import { useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import type { ConditionConcept } from "../api/conditions";
import colors from "../libs/colors";
import * as Style from "../libs/style";
import AllOfUs from "../components/common/AllOfUs";
import Clickable from "../components/common/Clickable";
import { StarIcon } from "../components/icons";
import Footer from "../components/results/Footer";
import SearchForm from "../components/SearchForm";
import SaveSearchDialog from "../components/shell/SaveSearchDialog";
import TopBar from "../components/shell/TopBar";
import { searchConceptIds } from "../utils/phenotypes";
import { parseVariantsText, resultsPath, VARIANTS_LIMIT, variantEntryStatus } from "../utils/variants";

/** The content width shared by every page that is a form, so the card and the footer line up. */
export const FORM_WIDTH = 800;

const styles = {
  main: {
    padding: "24px 28px 48px",
  },
  column: {
    maxWidth: FORM_WIDTH,
  },
  note: {
    ...Style.elements.fieldHint,
    marginTop: 14,
    color: colors.textSecondary,
  },
  saveButton: {
    ...Style.buttons.accent,
    padding: "8px 12px",
  },
} as const satisfies Record<string, CSSProperties>;

export default function SearchEntryPage() {
  const navigate = useNavigate();
  const [variants, setVariants] = useState("");
  // The phenotypes picked from the dropdown, as concepts rather than names, so the backend counts
  // exactly what the user chose instead of re-resolving a name -- which matters for concepts a
  // text path would skip, e.g. ones with a zero participant estimate.
  const [phenotypes, setPhenotypes] = useState<ConditionConcept[]>([]);
  const [saving, setSaving] = useState(false);
  const { canSearch } = variantEntryStatus(variants, VARIANTS_LIMIT);

  function handleSearch() {
    navigate(resultsPath(parseVariantsText(variants), searchConceptIds(phenotypes)));
  }

  return (
    <>
      <TopBar
        title="New search"
        lede={
          <>
            Variant frequencies across the <AllOfUs /> cohort and among participants with a condition, with gnomAD, ClinVar
            and predicted impact beside them.
          </>
        }
      />
      <main style={styles.main}>
        <div style={styles.column}>
          <SearchForm
            variants={variants}
            onVariantsChange={setVariants}
            phenotypes={phenotypes}
            onPhenotypesChange={setPhenotypes}
            onSearch={handleSearch}
            withExamples
            secondaryActions={
              <Clickable
                style={styles.saveButton}
                hoverStyle={Style.buttons.accentHover}
                disabledStyle={Style.buttons.disabled}
                disabled={!canSearch}
                onClick={() => setSaving(true)}
                aria-haspopup="dialog"
              >
                <StarIcon size={13} strokeWidth={2.2} aria-hidden="true" />
                Save as…
              </Clickable>
            }
          />
          <p style={styles.note}>
            Searches you run are kept under Recent in this browser. Save one to name it and keep it.
          </p>
          <Footer style={{ marginTop: 28 }} />
        </div>
      </main>
      {saving && (
        <SaveSearchDialog
          variants={parseVariantsText(variants)}
          phenotypes={phenotypes}
          onClose={() => setSaving(false)}
          onSaved={(search) => {
            setSaving(false);
            navigate(`/saved/${search.id}`);
          }}
        />
      )}
    </>
  );
}
