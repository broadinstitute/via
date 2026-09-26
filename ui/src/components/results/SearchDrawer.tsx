import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import type { ConditionConcept } from "../../api/conditions";
import { overLimitMessage, variantEntryStatus } from "../../utils/variants";
import Clickable from "../common/Clickable";
import { SearchIcon } from "../icons";
import PhenotypeStep from "../PhenotypeStep";
import SearchSteps from "../SearchSteps";
import VariantsStep from "../VariantsStep";

const styles = {
  drawer: {
    padding: 16,
    background: colors.surface0,
    borderBottom: `1px solid ${colors.border}`,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  error: {
    marginRight: "auto",
    color: colors.textDanger,
    fontSize: 12.5,
    fontWeight: 600,
  },
} as const satisfies Record<string, CSSProperties>;

interface SearchDrawerProps {
  open: boolean;
  variantsText: string;
  conditionText: string;
  /** The concept the page was searched with, shown as already picked. */
  initialCondition: ConditionConcept | null;
  variantsLimit: number;
  onVariantsChange: (value: string) => void;
  /** Same contract as ConditionSearchField: fires before onConditionSelect on a pick. */
  onConditionChange: (value: string) => void;
  onConditionSelect: (concept: ConditionConcept) => void;
  onCancel: () => void;
  onSearch: () => void;
}

/** The results page's "Modify search" form: the entry page's two steps, in a drop-down drawer. */
export default function SearchDrawer({
  open,
  variantsText,
  conditionText,
  initialCondition,
  variantsLimit,
  onVariantsChange,
  onConditionChange,
  onConditionSelect,
  onCancel,
  onSearch,
}: SearchDrawerProps) {
  const { count: enteredCount, overLimit, canSearch } = variantEntryStatus(variantsText, variantsLimit);

  return (
    <div style={{ ...styles.drawer, display: open ? "block" : "none" }}>
      <SearchSteps>
        <VariantsStep
          value={variantsText}
          onChange={onVariantsChange}
          limit={variantsLimit}
          minHeight={140}
          flat
        />
        <PhenotypeStep
          id="drawerCondition"
          value={conditionText}
          initialSelection={initialCondition}
          onChange={onConditionChange}
          onSelect={onConditionSelect}
          flat
        />
      </SearchSteps>

      <div style={styles.actions}>
        {overLimit && (
          <p style={styles.error} aria-live="polite">
            {overLimitMessage(enteredCount, variantsLimit)}
          </p>
        )}
        <Clickable style={Style.buttons.secondary} hoverStyle={Style.buttons.secondaryHover} onClick={onCancel}>
          Cancel
        </Clickable>
        <Clickable
          style={Style.buttons.primary}
          hoverStyle={Style.buttons.primaryHover}
          disabledStyle={Style.buttons.disabled}
          disabled={!canSearch}
          onClick={onSearch}
        >
          <SearchIcon size={14} aria-hidden="true" />
          Search
        </Clickable>
      </div>
    </div>
  );
}
