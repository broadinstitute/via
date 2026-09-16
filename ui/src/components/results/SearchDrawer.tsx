import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import { parseVariantsText } from "../../utils/variants";
import Clickable from "../common/Clickable";

const styles = {
  drawer: {
    padding: "16px 20px",
    background: colors.surface1,
    borderBottom: `1px solid ${colors.border}`,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 16,
    alignItems: "start",
  },
  variantsInput: {
    ...Style.inputs.text,
    minHeight: 60,
    resize: "vertical",
  },
  hint: {
    marginTop: 3,
    fontSize: 10,
    color: colors.textMuted,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },
} as const satisfies Record<string, CSSProperties>;

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
  const enteredCount = parseVariantsText(variantsText).length;

  return (
    <div style={{ ...styles.drawer, display: open ? "block" : "none" }}>
      <div style={styles.grid}>
        <div>
          <label htmlFor="drawerVariants" style={Style.inputs.label}>
            Candidate genes or variants (limit {variantsLimit})
          </label>
          <textarea
            id="drawerVariants"
            rows={10}
            value={variantsText}
            onChange={(event) => onVariantsChange(event.target.value)}
            style={styles.variantsInput}
          />
          <div style={styles.hint}>
            {enteredCount} of {variantsLimit} candidate variants entered
          </div>
        </div>
        <div>
          <label htmlFor="drawerHpo" style={Style.inputs.label}>
            Phenotype (HPO term — limit 1)
          </label>
          <input
            id="drawerHpo"
            type="text"
            value={hpoText}
            onChange={(event) => onHpoChange(event.target.value)}
            style={Style.inputs.text}
          />
        </div>
      </div>
      <div style={styles.actions}>
        <Clickable style={Style.buttons.secondary} hoverStyle={Style.buttons.secondaryHover} onClick={onCancel}>
          Cancel
        </Clickable>
        <Clickable style={Style.buttons.primary} hoverStyle={Style.buttons.primaryHover} onClick={onSearch}>
          Search
        </Clickable>
      </div>
    </div>
  );
}
