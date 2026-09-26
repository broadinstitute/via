import { useId, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import colors from "../../libs/colors";
import { useHover } from "../../libs/hooks";
import * as Style from "../../libs/style";
import Clickable from "../common/Clickable";
import { ArrowLeftIcon, GearIcon, PencilIcon, SearchIcon, UserIcon } from "../icons";
import SettingsDialog from "../settings/SettingsDialog";

/** Exported for what has to sit just below the bar, e.g. the edit-search popover's backdrop. */
export const TOP_BAR_HEIGHT = 41;

const styles = {
  topbar: {
    // Pinned to the top of the window. The edit-search popover's backdrop is fixed to the window
    // and starts TOP_BAR_HEIGHT down, so it only lines up with the bar if the bar can't scroll
    // away; otherwise an undimmed strip is left over the results. Keeps the search summary in
    // view while scrolling, too.
    position: "sticky",
    top: 0,
    // Above the page, so the edit-search popover and its backdrop, rendered in here, cover
    // the results -- including their own stacked bits, like the tables' sticky headers.
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: TOP_BAR_HEIGHT,
    padding: "0 20px",
    background: colors.surface2,
    borderBottom: `1px solid ${colors.border}`,
    color: colors.textSecondary,
    fontSize: 12,
  },
  caseInfo: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flex: 1,
    minWidth: 0,
    marginRight: 20,
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    padding: "0 16px 0 0",
    border: "none",
    borderRight: `1px solid ${colors.border}`,
    background: "none",
    color: colors.textSecondary,
    cursor: "pointer",
  },
  // Styled as a search field holding the current terms; clicking anywhere in it opens the drawer.
  // Positioning context for the edit-search popover, which hangs from the search box.
  searchAnchor: {
    position: "relative",
    display: "flex",
    flex: 1,
    minWidth: 0,
    maxWidth: 575,
  },
  searchBox: {
    ...Style.inputs.text,
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    height: 29,
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
  searchBoxHover: {
    borderColor: colors.borderHover,
  },
  searchIcon: {
    flexShrink: 0,
    color: colors.textMuted,
  },
  searchTerms: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    overflow: "hidden",
  },
  searchField: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    whiteSpace: "nowrap",
  },
  termDivider: {
    flexShrink: 0,
    width: 1,
    height: 14,
    background: colors.border,
  },
  valueBadge: {
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
  skeletonBadge: {
    display: "inline-block",
    width: 72,
    height: 18,
    borderRadius: 6,
    background: colors.border,
  },
  modifyHint: {
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
  modifyHintHover: {
    background: colors.bgAccent,
  },
  user: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 500,
  },
  userIcon: {
    flexShrink: 0,
    color: colors.textAccent,
  },
  /** Same rule as the back button's right border, between the email and the gear. */
  userDivider: {
    width: 1,
    height: 16,
    margin: "0 8px",
    background: colors.border,
  },
} as const satisfies Record<string, CSSProperties>;

interface TopBarProps {
  loading?: boolean;
  variantsEnteredCount?: number;
  /** The picked condition's name. */
  condition?: string;
  userEmail: string;
  onModifySearch?: () => void;
  /** Whether the edit-search popover is open, which the search box shows as focused. */
  modifyOpen?: boolean;
  /** The edit-search popover (SearchPopover), anchored under the search box. */
  editSearchPanel?: ReactNode;
}

export default function TopBar({
  loading,
  variantsEnteredCount,
  condition,
  userEmail,
  onModifySearch,
  modifyOpen = false,
  editSearchPanel,
}: TopBarProps) {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { hovered: searchHovered, hoverProps: searchHoverProps } = useHover();
  const termsId = useId();

  return (
    <div style={styles.topbar}>
      {onModifySearch && (
        <div style={styles.caseInfo}>
          <Clickable
            style={styles.backButton}
            hoverStyle={{ color: colors.textAccent }}
            onClick={() => navigate("/")}
            aria-label="Back to search"
            title="Back to search"
          >
            <ArrowLeftIcon size={14} strokeWidth={2.5} />
          </Clickable>
          <div style={styles.searchAnchor}>
            <Clickable
              style={{
                ...styles.searchBox,
                ...(searchHovered && !loading ? styles.searchBoxHover : undefined),
                ...(modifyOpen ? Style.inputs.focused : undefined),
              }}
              disabledStyle={{ cursor: "default" }}
              onClick={onModifySearch}
              disabled={loading}
              aria-label="Edit search"
              aria-describedby={termsId}
              aria-expanded={modifyOpen}
              {...searchHoverProps}
            >
              <SearchIcon size={14} strokeWidth={2.5} style={styles.searchIcon} aria-hidden="true" />
              <span id={termsId} style={styles.searchTerms}>
                <span style={styles.searchField}>
                  Variants
                  {loading ? (
                    <span className="animate-skeleton-pulse" style={styles.skeletonBadge} />
                  ) : (
                    <span style={styles.valueBadge}>{variantsEnteredCount} entered</span>
                  )}
                </span>
                <span style={styles.termDivider} aria-hidden="true" />
                <span style={styles.searchField}>
                  Phenotype
                  {loading ? (
                    <span className="animate-skeleton-pulse" style={styles.skeletonBadge} />
                  ) : (
                    <span style={styles.valueBadge} title={condition || undefined}>
                      {condition || "None entered"}
                    </span>
                  )}
                </span>
              </span>
              {!loading && (
                <span
                  style={{ ...styles.modifyHint, ...(searchHovered ? styles.modifyHintHover : undefined) }}
                  aria-hidden="true"
                >
                  <PencilIcon size={11} strokeWidth={2.5} />
                  Edit
                </span>
              )}
            </Clickable>
            {editSearchPanel}
          </div>
        </div>
      )}
      <div style={styles.user}>
        <UserIcon size={16} style={styles.userIcon} />
        {userEmail}
        <span style={styles.userDivider} aria-hidden="true" />
        <Clickable
          style={Style.buttons.icon}
          hoverStyle={Style.buttons.iconHover}
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          aria-haspopup="dialog"
          title="Settings"
        >
          <GearIcon size={15} />
        </Clickable>
      </div>
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
