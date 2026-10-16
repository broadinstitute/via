import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { fetchQueryUsage, type QueryUsage } from "../../api/usage";
import colors from "../../libs/colors";
import { useHover, useMediaQuery } from "../../libs/hooks";
import * as Style from "../../libs/style";
import Clickable from "../common/Clickable";
import { GaugeIcon, GearIcon, PencilIcon, SearchIcon, UserIcon } from "../icons";
import SettingsDialog from "../settings/SettingsDialog";
import { formatBytes, formatUsd } from "../../utils/format";
import { describeAlternatives } from "../../utils/phenotypes";
import { usePreference } from "../../utils/preferences";

/** Exported for what has to sit just below the bar, e.g. the edit-search popover's backdrop. */
export const TOP_BAR_HEIGHT = 41;

// Below this width the bar's contents are compressed to fit
const COMPACT_QUERY = "(max-width: 860px)";

/** How often the usage meter re-reads the backend's total (if it's shown). */
export const USAGE_REFRESH_MS = 60_000;

const styles = {
  topbar: {
    position: "sticky",
    top: 0,
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
  // The mark and name, then (on the results page) the search box.
  leading: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flex: 1,
    minWidth: 0,
    marginRight: 20,
  },
  brand: {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    gap: 7,
    margin: "-4px -6px",
    padding: "4px 6px",
    borderRadius: 6,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 0.3,
    textDecoration: "none",
  },
  /** Matches the gear's (Style.buttons.iconHover). */
  brandHover: {
    ...Style.buttons.iconHover,
  },
  /**
   * On the results page, the rule between the brand and the search box. Its own element, not a
   * border on the brand, so the brand's hover fill doesn't run up against it.
   */
  brandDivider: {
    flexShrink: 0,
    width: 1,
    height: 22,
    background: colors.border,
  },
  brandMark: {
    display: "block",
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
  /** The variant count is short and always worth showing whole; the phenotype name gives way. */
  searchFieldFixed: {
    flexShrink: 0,
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
  meter: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 8px",
    border: "none",
    borderRadius: 999,
    background: "none",
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  meterHover: {
    background: colors.bgAccent,
    color: colors.textAccent,
  },
  meterIcon: {
    flexShrink: 0,
    color: colors.textAccent,
  },
  meterDot: {
    color: colors.textMuted,
    fontWeight: 400,
  },
  /** Same rule as the back button's right border, between the email and the gear. */
  userDivider: {
    width: 1,
    height: 16,
    margin: "0 8px",
    background: colors.border,
  },
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

const compactStyles = {
  topbar: { padding: "0 12px" },
  leading: { gap: 10, marginRight: 10 },
  searchBox: { gap: 8 },
  searchTerms: { gap: 8 },
  userDivider: { margin: "0 4px" },
} as const satisfies Record<string, CSSProperties>;

interface TopBarProps {
  loading?: boolean;
  variantsEnteredCount?: number;
  /** The picked conditions' names, in the order they were picked. */
  phenotypes?: string[];
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
  phenotypes = [],
  userEmail,
  onModifySearch,
  modifyOpen = false,
  editSearchPanel,
}: TopBarProps) {
  // The settings dialog: closed, open on its default panel, or open on a named one (the meter opens Usage).
  const [settings, setSettings] = useState<{ panel?: string } | null>(null);
  const [usage, setUsage] = useState<QueryUsage | null>(null);
  const { hovered: brandHovered, hoverProps: brandHoverProps } = useHover();
  const { hovered: searchHovered, hoverProps: searchHoverProps } = useHover();
  const termsId = useId();
  const compact = useMediaQuery(COMPACT_QUERY);
  const compactStyle = (key: keyof typeof compactStyles) => (compact ? compactStyles[key] : undefined);
  const fieldLabel = compact ? Style.elements.visuallyHidden : undefined;
  const hidePhenotype = compact && !loading && phenotypes.length === 0;
  const badge = describePhenotypeBadge(phenotypes);
  const searchBoxRef = useRef<HTMLButtonElement>(null);

  // When the edit-search popover closes, hand focus back to the box that opened it; otherwise it
  // stays on a field that's now hidden.
  const wasModifyOpen = useRef(modifyOpen);
  useEffect(() => {
    if (wasModifyOpen.current && !modifyOpen) searchBoxRef.current?.focus();
    wasModifyOpen.current = modifyOpen;
  }, [modifyOpen]);

  // The meter is opt-in, from the Usage panel. While it's on it reads the backend's running total
  // when switched on or mounted, each time a search finishes loading (a search is what moves it),
  // when the settings dialog closes (its Usage panel may have shown newer numbers), and otherwise
  // every minute. Reads can overlap, so only the newest one's reply is kept. If it can't be read
  // the meter stays off the bar; the Usage panel is where that failure is explained.
  const [showMeter] = usePreference("showUsageMeter");
  const usageRead = useRef(0);
  const readUsage = useCallback(() => {
    const read = ++usageRead.current;
    fetchQueryUsage()
      .then((next) => {
        if (read === usageRead.current) setUsage(next);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!showMeter || loading) return;
    readUsage();
    const timer = window.setInterval(readUsage, USAGE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [showMeter, loading, readUsage]);

  const meter =
    showMeter && usage
      ? {
          scanned: formatBytes(usage.bytesProcessed),
          billed: formatBytes(usage.bytesBilled),
          cost: formatUsd(usage.estimatedCostUsd),
        }
      : null;

  return (
    <div style={{ ...styles.topbar, ...compactStyle("topbar") }}>
      <div style={{ ...styles.leading, ...compactStyle("leading") }}>
        <Link
          to="/"
          style={{
            ...styles.brand,
            ...(brandHovered ? styles.brandHover : undefined),
          }}
          aria-label="VIA home, new search"
          {...brandHoverProps}
        >
          <img src="/favicon.svg" alt="" width={22} height={22} style={styles.brandMark} />
          VIA
        </Link>
        {onModifySearch && <span style={styles.brandDivider} aria-hidden="true" />}
        {onModifySearch && (
          <div style={styles.searchAnchor}>
            <Clickable
              ref={searchBoxRef}
              style={{
                ...styles.searchBox,
                ...compactStyle("searchBox"),
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
              <span id={termsId} style={{ ...styles.searchTerms, ...compactStyle("searchTerms") }}>
                <span style={{ ...styles.searchField, ...styles.searchFieldFixed }}>
                  <span style={fieldLabel}>Variants</span>
                  {loading ? (
                    <span className="animate-skeleton-pulse" style={styles.skeletonBadge} />
                  ) : (
                    <span style={styles.valueBadge}>
                      {compact
                        ? `${variantsEnteredCount} variant${variantsEnteredCount === 1 ? "" : "s"}`
                        : `${variantsEnteredCount} entered`}
                    </span>
                  )}
                </span>
                {!hidePhenotype && <span style={styles.termDivider} aria-hidden="true" />}
                <span style={hidePhenotype ? Style.elements.visuallyHidden : styles.searchField}>
                  <span style={fieldLabel}>Phenotype</span>
                  {loading ? (
                    <span className="animate-skeleton-pulse" style={styles.skeletonBadge} />
                  ) : (
                    <span style={styles.valueBadge} title={badge.title}>
                      {badge.label}
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
                  {!compact && "Edit"}
                </span>
              )}
            </Clickable>
            {editSearchPanel}
          </div>
        )}
      </div>
      <div style={styles.user}>
        {meter && (
          <>
            <Clickable
              style={styles.meter}
              hoverStyle={styles.meterHover}
              onClick={() => setSettings({ panel: "usage" })}
              aria-label={`BigQuery usage this session: ${meter.scanned} scanned, ${meter.billed} billed, ${meter.cost} estimated. Open usage details`}
              aria-haspopup="dialog"
              title={`BigQuery this session: ${meter.scanned} scanned · ${meter.billed} billed · ${meter.cost} estimated`}
            >
              <GaugeIcon size={14} strokeWidth={2.2} style={styles.meterIcon} aria-hidden="true" />
              {compact ? (
                <span>{meter.cost}</span>
              ) : (
                <>
                  <span>{meter.scanned}</span>
                  <span style={styles.meterDot} aria-hidden="true">·</span>
                  <span>{meter.billed}</span>
                  <span style={styles.meterDot} aria-hidden="true">·</span>
                  <span>{meter.cost}</span>
                </>
              )}
            </Clickable>
            <span style={{ ...styles.userDivider, ...compactStyle("userDivider") }} aria-hidden="true" />
          </>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} title={compact ? userEmail : undefined}>
          <UserIcon size={16} style={styles.userIcon} />
          <span style={compact ? Style.elements.visuallyHidden : undefined}>{userEmail}</span>
        </span>
        <span style={{ ...styles.userDivider, ...compactStyle("userDivider") }} aria-hidden="true" />
        <Clickable
          style={Style.buttons.icon}
          hoverStyle={Style.buttons.iconHover}
          onClick={() => setSettings({})}
          aria-label="Settings"
          aria-haspopup="dialog"
          title="Settings"
        >
          <GearIcon size={15} />
        </Clickable>
      </div>
      {settings && (
        <SettingsDialog
          initialPanel={settings.panel}
          onClose={() => {
            setSettings(null);
            if (showMeter) readUsage();
          }}
        />
      )}
    </div>
  );
}
