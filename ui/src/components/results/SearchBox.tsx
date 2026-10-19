import { useEffect, useId, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import colors from "../../libs/colors";
import { useHover, useMediaQuery } from "../../libs/hooks";
import * as Style from "../../libs/style";
import { describeAlternatives } from "../../utils/phenotypes";
import Clickable from "../common/Clickable";
import { PencilIcon, SearchIcon } from "../icons";

// Below this width the box's contents are compressed to fit.
const COMPACT_QUERY = "(max-width: 860px)";

const styles = {
  // Styled as a search field holding the current terms; clicking anywhere in it opens the drawer.
  // Positioning context for the edit-search popover, which hangs from the search box.
  anchor: {
    position: "relative",
    display: "flex",
    flex: 1,
    minWidth: 0,
    maxWidth: 640,
  },
  box: {
    ...Style.inputs.text,
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    height: 30,
    // A pill, the usual shape for a search box; the extra left padding clears the curve.
    borderRadius: 999,
    padding: "0 4px 0 12px",
    // Page-coloured against the white bar, so it reads as a field. Goes white while the drawer
    // is open, via inputs.focused.
    background: colors.surface0,
    color: colors.textSecondary,
    textAlign: "left",
    cursor: "pointer",
  },
  boxHover: {
    borderColor: colors.borderHover,
  },
  icon: {
    flexShrink: 0,
    color: colors.textMuted,
  },
  terms: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    overflow: "hidden",
  },
  field: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    whiteSpace: "nowrap",
  },
  /** The variant count is short and always worth showing whole; the phenotype name gives way. */
  fieldFixed: {
    flexShrink: 0,
  },
  divider: {
    flexShrink: 0,
    width: 1,
    height: 14,
    background: colors.border,
  },
  badge: {
    maxWidth: 240,
    overflow: "hidden",
    textOverflow: "ellipsis",
    padding: "2px 8px",
    borderRadius: 6,
    background: colors.bgAccent,
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: 600,
  },
  skeleton: {
    display: "inline-block",
    width: 72,
    height: 18,
    borderRadius: 6,
    background: colors.border,
  },
  hint: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    marginLeft: "auto",
    padding: "3px 8px",
    // Matches the box's curve, so its hover fill sits snugly in the rounded end.
    borderRadius: 999,
    color: colors.textAccent,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  hintHover: {
    background: colors.bgAccent,
  },
} as const satisfies Record<string, CSSProperties>;

const compactStyles = {
  box: { gap: 8 },
  terms: { gap: 8 },
} as const satisfies Record<string, CSSProperties>;

/**
 * The phenotype badge is 240px wide at most. Up to about this many characters of 12px text fit
 * in it, so a short list is shown whole and a long one as its first name and how many more.
 */
const BADGE_CHARS = 34;

/** What the badge says for the picked conditions, and the full list for its tooltip. */
export function describePhenotypeBadge(phenotypes: string[]): { label: string; title: string | undefined } {
  if (phenotypes.length === 0) return { label: "None entered", title: undefined };
  const full = describeAlternatives(phenotypes);
  if (phenotypes.length === 1 || full.length <= BADGE_CHARS) return { label: full, title: full };
  return { label: `${phenotypes[0]} +${phenotypes.length - 1} more`, title: full };
}

interface SearchBoxProps {
  loading?: boolean;
  variantsEnteredCount: number;
  /** The picked conditions' names, in the order they were picked. */
  phenotypes?: string[];
  onModifySearch: () => void;
  /** Whether the edit-search popover is open, which the box shows as focused. */
  modifyOpen?: boolean;
  /** The edit-search popover (SearchPopover), anchored under the box. */
  editSearchPanel?: ReactNode;
}

/**
 * The results page's top-bar control: the search's terms as a search field, which opens the
 * edit-search popover from anywhere in it.
 */
export default function SearchBox({
  loading,
  variantsEnteredCount,
  phenotypes = [],
  onModifySearch,
  modifyOpen = false,
  editSearchPanel,
}: SearchBoxProps) {
  const { hovered, hoverProps } = useHover();
  const termsId = useId();
  const compact = useMediaQuery(COMPACT_QUERY);
  const compactStyle = (key: keyof typeof compactStyles) => (compact ? compactStyles[key] : undefined);
  const fieldLabel = compact ? Style.elements.visuallyHidden : undefined;
  const hidePhenotype = compact && !loading && phenotypes.length === 0;
  const badge = describePhenotypeBadge(phenotypes);
  const boxRef = useRef<HTMLButtonElement>(null);

  // When the edit-search popover closes, hand focus back to the box that opened it; otherwise it
  // stays on a field that's now hidden.
  const wasModifyOpen = useRef(modifyOpen);
  useEffect(() => {
    if (wasModifyOpen.current && !modifyOpen) boxRef.current?.focus();
    wasModifyOpen.current = modifyOpen;
  }, [modifyOpen]);

  return (
    <div style={styles.anchor}>
      <Clickable
        ref={boxRef}
        style={{
          ...styles.box,
          ...compactStyle("box"),
          ...(hovered && !loading ? styles.boxHover : undefined),
          ...(modifyOpen ? Style.inputs.focused : undefined),
        }}
        disabledStyle={{ cursor: "default" }}
        onClick={onModifySearch}
        disabled={loading}
        aria-label="Edit search"
        aria-describedby={termsId}
        aria-expanded={modifyOpen}
        {...hoverProps}
      >
        <SearchIcon size={14} strokeWidth={2.5} style={styles.icon} aria-hidden="true" />
        <span id={termsId} style={{ ...styles.terms, ...compactStyle("terms") }}>
          <span style={{ ...styles.field, ...styles.fieldFixed }}>
            <span style={fieldLabel}>Variants</span>
            {loading ? (
              <span className="animate-skeleton-pulse" style={styles.skeleton} />
            ) : (
              <span style={styles.badge}>
                {compact
                  ? `${variantsEnteredCount} variant${variantsEnteredCount === 1 ? "" : "s"}`
                  : `${variantsEnteredCount} entered`}
              </span>
            )}
          </span>
          {!hidePhenotype && <span style={styles.divider} aria-hidden="true" />}
          <span style={hidePhenotype ? Style.elements.visuallyHidden : styles.field}>
            <span style={fieldLabel}>Phenotype</span>
            {loading ? (
              <span className="animate-skeleton-pulse" style={styles.skeleton} />
            ) : (
              <span style={styles.badge} title={badge.title}>
                {badge.label}
              </span>
            )}
          </span>
        </span>
        {!loading && (
          <span style={{ ...styles.hint, ...(hovered ? styles.hintHover : undefined) }} aria-hidden="true">
            <PencilIcon size={11} strokeWidth={2.5} />
            {!compact && "Edit"}
          </span>
        )}
      </Clickable>
      {editSearchPanel}
    </div>
  );
}
