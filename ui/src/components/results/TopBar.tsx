import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import Clickable from "../Clickable";
import { ArrowLeftIcon, PencilIcon, SearchIcon, UserIcon } from "../icons";

const styles = {
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 41,
    padding: "0 20px",
    background: colors.surface2,
    borderBottom: `1px solid ${colors.border}`,
    color: colors.textSecondary,
    fontSize: 12,
  },
  caseInfo: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    padding: "0 16px 0 0",
    border: "none",
    // Doubles as the divider between the back arrow and the search summary beside it.
    borderRight: `1px solid ${colors.border}`,
    background: "none",
    color: colors.textSecondary,
    cursor: "pointer",
  },
  searchLead: {
    display: "flex",
    alignItems: "center",
    color: colors.textPrimary,
  },
  searchField: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: colors.textSecondary,
  },
  valueBadge: {
    padding: "2px 8px",
    borderRadius: 6,
    background: colors.bgAccent,
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: 600,
  },
  // Same footprint as valueBadge, so the bar doesn't reflow when the real values arrive.
  skeletonBadge: {
    display: "inline-block",
    width: 72,
    height: 20,
    borderRadius: 6,
    background: colors.border,
  },
  editButton: {
    ...Style.buttons.accent,
    gap: 4,
    padding: "4px 10px",
    fontSize: 11,
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
} as const satisfies Record<string, CSSProperties>;

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
          <span style={styles.searchLead} role="img" aria-label="Search terms" title="Search terms">
            <SearchIcon size={14} strokeWidth={2.5} />
          </span>
          <span style={styles.searchField}>
            Candidate variants{" "}
            {loading ? (
              <span className="animate-skeleton-pulse" style={styles.skeletonBadge} />
            ) : (
              <span style={styles.valueBadge}>{variantsEnteredCount} entered</span>
            )}
          </span>
          <span style={styles.searchField}>
            Phenotype{" "}
            {loading ? (
              <span className="animate-skeleton-pulse" style={styles.skeletonBadge} />
            ) : (
              <span style={styles.valueBadge}>{hpoTerm || "None entered"}</span>
            )}
          </span>
          <Clickable
            style={styles.editButton}
            hoverStyle={Style.buttons.accentHover}
            disabledStyle={Style.buttons.disabled}
            onClick={onModifySearch}
            disabled={loading}
          >
            <PencilIcon size={11} strokeWidth={2.5} />
            Modify search
          </Clickable>
        </div>
      )}
      <div style={styles.user}>
        <UserIcon size={16} style={styles.userIcon} />
        {userEmail}
      </div>
    </div>
  );
}
