import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation, useMatch } from "react-router-dom";
import colors from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import { IS_BETA } from "../../libs/version";
import { formatBytes, formatUsd } from "../../utils/format";
import { describeAlternatives } from "../../utils/phenotypes";
import { usePreference } from "../../utils/preferences";
import { describeSearchedAt, sameCriteria, useRecentSearches, type RecentSearch } from "../../utils/recentSearches";
import { useSavedSearches, type SavedSearch } from "../../utils/savedSearches";
import { useUsageMeter } from "../../utils/useUsageMeter";
import { resultsPath } from "../../utils/variants";
import Clickable from "../common/Clickable";
import {
  ActivityIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ClockIcon,
  DatabaseIcon,
  GaugeIcon,
  PlusIcon,
  StarIcon,
} from "../icons";

export const RAIL_WIDTH = 264;
export const RAIL_COLLAPSED_WIDTH = 56;

/** Saved and recent searches the rail lists before pointing at the full page. */
export const RAIL_LIST_LIMIT = 5;

const styles = {
  rail: {
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    width: RAIL_WIDTH,
    height: "100vh",
    padding: "12px 10px 10px",
    overflowY: "auto",
    scrollbarWidth: "thin",
    background: colors.surface1,
    borderRight: `1px solid ${colors.border}`,
    fontSize: 12.5,
  },
  railCollapsed: {
    width: RAIL_COLLAPSED_WIDTH,
    alignItems: "center",
    padding: "12px 0 10px",
    gap: 4,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "2px 8px 12px",
  },
  brandMark: {
    display: "block",
    flexShrink: 0,
  },
  brandName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 0.3,
    textDecoration: "none",
  },
  beta: {
    padding: "1px 6px",
    borderRadius: 999,
    background: colors.bgAccent,
    color: colors.textAccent,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fold: {
    ...Style.buttons.icon,
    marginLeft: "auto",
    padding: 4,
    borderRadius: 6,
  },
  heading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    margin: "14px 10px 4px",
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headingLink: {
    color: colors.textAccent,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0,
    textTransform: "none",
    textDecoration: "none",
  },
  headingNote: {
    margin: "0 10px",
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 1.4,
  },
  item: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    minWidth: 0,
    padding: "7px 10px",
    borderRadius: Style.radius,
    color: colors.textBody,
    textDecoration: "none",
  },
  itemHovered: {
    background: colors.surface0,
  },
  itemCurrent: {
    background: colors.bgAccent,
  },
  itemNew: {
    alignItems: "center",
    marginBottom: 2,
    border: `1px solid ${colors.borderStrong}`,
    background: colors.surface2,
  },
  itemRow: {
    alignItems: "center",
  },
  icon: {
    flexShrink: 0,
    marginTop: 1,
    color: colors.textSecondary,
  },
  iconCurrent: {
    color: colors.textAccent,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    minWidth: 0,
    flex: 1,
  },
  title: {
    overflow: "hidden",
    color: colors.textAccent,
    fontSize: 12.5,
    fontWeight: 600,
    lineHeight: 1.3,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  titleMono: {
    ...Style.elements.mono,
    fontSize: 12,
    fontWeight: 500,
    color: colors.textBody,
  },
  titlePlain: {
    fontWeight: 500,
    color: colors.textBody,
  },
  subtitle: {
    overflow: "hidden",
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 1.4,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  now: {
    color: colors.textAccent,
    fontWeight: 600,
  },
  trailing: {
    flexShrink: 0,
    marginLeft: "auto",
    color: colors.textSecondary,
    fontSize: 11,
    whiteSpace: "nowrap",
  },
  meterValue: {
    ...Style.elements.mono,
    fontSize: 11,
    fontVariantNumeric: "tabular-nums",
  },
  spacer: {
    flex: 1,
  },
  user: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    marginTop: 8,
    padding: "10px 8px 2px",
    borderTop: `1px solid ${colors.border}`,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  avatar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: colors.bgAccent,
    color: colors.textAccent,
    fontSize: 10.5,
    fontWeight: 700,
  },
  email: {
    overflow: "hidden",
    color: colors.textBody,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // The folded rail: one square per destination.
  iconItem: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: Style.radius,
    color: colors.textSecondary,
    textDecoration: "none",
  },
  iconItemCurrent: {
    background: colors.bgAccent,
    color: colors.textAccent,
  },
  iconItemNew: {
    border: `1px solid ${colors.borderStrong}`,
    background: colors.surface2,
    color: colors.textAccent,
  },
  separator: {
    width: 28,
    height: 1,
    margin: "6px 0",
    background: colors.border,
  },
} as const satisfies Record<string, CSSProperties>;

/** "MB" for m.bemis@…: the local part's first letter and the first after a separator, or its first two. */
export function initials(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return letters.toUpperCase();
}

/** A search's one-line summary for the rail: its first variant and how many more. */
export function describeVariants(variants: string[]): string {
  if (variants.length === 0) return "No variants";
  return variants.length === 1 ? variants[0] : `${variants[0]} +${variants.length - 1}`;
}

const conditionNames = (search: { conditions: { name: string }[] }) =>
  search.conditions.length > 0 ? describeAlternatives(search.conditions.map((c) => c.name)) : "No phenotype";

/** The results page's criteria, from its URL, so the rail can mark which recent search is showing. */
function currentCriteria(pathname: string, search: string) {
  if (pathname !== "/results") return null;
  const params = new URLSearchParams(search);
  return {
    variants: params.getAll("variants"),
    conditions: params.getAll("conditionConceptIds").map((id) => ({ conceptId: Number(id), name: "" })),
  };
}

interface ItemProps {
  to: string;
  icon: ReactNode;
  title: ReactNode;
  titleStyle?: CSSProperties;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  /**
   * Marks the item as the one showing. By default that's when its route is the current one; a
   * recent search (every one of which leads to /results) passes its own answer instead.
   */
  current?: boolean;
  /** Accessible name, when the visible text isn't one. */
  label?: string;
  style?: CSSProperties;
  hoverKey: string;
  hoveredKey: string | null;
  hoverProps: (key: string) => { onMouseEnter: () => void; onMouseLeave: () => void };
}

/** Whether `to` is the route showing, by path alone: "/saved/x" doesn't light "/saved". */
function useRouteActive(to: string): boolean {
  return useMatch({ path: to.split("?")[0], end: true }) !== null;
}

function Item({ to, icon, title, titleStyle, subtitle, trailing, current, label, style, hoverKey, hoveredKey, hoverProps }: ItemProps) {
  const routeActive = useRouteActive(to);
  const active = current ?? routeActive;
  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      {...hoverProps(hoverKey)}
      style={{
        ...styles.item,
        ...style,
        ...(hoveredKey === hoverKey ? styles.itemHovered : undefined),
        ...(active ? styles.itemCurrent : undefined),
      }}
    >
      <span style={{ ...styles.icon, ...(active ? styles.iconCurrent : undefined) }} aria-hidden="true">
        {icon}
      </span>
      <span style={styles.text}>
        <span style={{ ...styles.title, ...titleStyle }}>{title}</span>
        {subtitle !== undefined && <span style={styles.subtitle}>{subtitle}</span>}
      </span>
      {trailing !== undefined && <span style={styles.trailing}>{trailing}</span>}
    </Link>
  );
}

interface IconItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  /** Lit as well as when its route is showing: the Recent icon while a recent search's results show. */
  current?: boolean;
  style?: CSSProperties;
}

function IconItem({ to, icon, label, current = false, style }: IconItemProps) {
  const active = useRouteActive(to) || current;
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      style={{
        ...styles.iconItem,
        ...style,
        ...(active ? styles.iconItemCurrent : undefined),
      }}
    >
      {icon}
    </Link>
  );
}

interface RailProps {
  userEmail: string;
  /** Folded to the icon strip. */
  collapsed: boolean;
  /** Whether the fold is the user's own, which the unfold button can undo; a narrow window's isn't. */
  canUnfold: boolean;
}

/**
 * The one piece of chrome on every view: the way to a new search, to saved and recent searches,
 * and to the workspace's facts (data sources, system status, usage), with the signed-in user at
 * the foot. Folds to a strip of icons when the window is narrow, when a view brings its own left
 * rail, or when the user folds it.
 */
export default function Rail({ userEmail, collapsed, canUnfold }: RailProps) {
  const location = useLocation();
  const saved = useSavedSearches();
  const recent = useRecentSearches();
  const [, setRailCollapsed] = usePreference("railCollapsed");
  const [showMeter] = usePreference("showUsageMeter");
  const usage = useUsageMeter(showMeter, recent);
  const { hoveredKey, hoverProps } = useHoveredKey<string>();
  const showing = currentCriteria(location.pathname, location.search);
  const isShowing = (search: RecentSearch) => showing !== null && sameCriteria(search, showing);

  const meter = usage && {
    cost: formatUsd(usage.estimatedCostUsd),
    detail: `BigQuery this session: ${formatBytes(usage.bytesProcessed)} scanned · ${formatBytes(usage.bytesBilled)} billed · ${formatUsd(usage.estimatedCostUsd)} estimated`,
  };

  if (collapsed) {
    return (
      <nav aria-label="Workspace" style={{ ...styles.rail, ...styles.railCollapsed }}>
        <Link to="/" aria-label="VIA" title="VIA" style={{ ...styles.iconItem, marginBottom: 6 }}>
          <img src="/favicon.svg" alt="" width={26} height={26} style={styles.brandMark} />
        </Link>
        <IconItem to="/" label="New search" icon={<PlusIcon size={16} strokeWidth={2.4} />} style={styles.iconItemNew} />
        <span style={styles.separator} aria-hidden="true" />
        <IconItem to="/saved" label={`Saved searches, ${saved.length}`} icon={<StarIcon size={17} />} />
        <IconItem
          to="/recent"
          label={`Recent searches, ${recent.length}`}
          icon={<ClockIcon size={17} strokeWidth={2.2} />}
          current={recent.some(isShowing)}
        />
        <span style={styles.spacer} />
        <IconItem to="/sources" label="Data sources" icon={<DatabaseIcon size={16} strokeWidth={2.2} />} />
        <IconItem to="/status" label="System status" icon={<ActivityIcon size={16} strokeWidth={2.2} />} />
        <IconItem
          to="/usage"
          label={meter ? `Usage, ${meter.cost} this session` : "Usage"}
          icon={<GaugeIcon size={16} strokeWidth={2.2} />}
        />
        <span style={styles.separator} aria-hidden="true" />
        {canUnfold && (
          <Clickable
            style={{ ...styles.iconItem, border: "none", background: "none", cursor: "pointer" }}
            hoverStyle={styles.itemHovered}
            onClick={() => setRailCollapsed(false)}
            aria-label="Unfold the rail"
            title="Unfold"
          >
            <ChevronsRightIcon size={14} strokeWidth={2.2} />
          </Clickable>
        )}
        <span style={{ ...styles.avatar, width: 26, height: 26, marginTop: 4 }} title={userEmail} aria-label={userEmail} role="img">
          {initials(userEmail)}
        </span>
      </nav>
    );
  }

  return (
    <nav aria-label="Workspace" style={styles.rail}>
      <div style={styles.brand}>
        <img src="/favicon.svg" alt="" width={26} height={26} style={styles.brandMark} />
        <Link to="/" style={styles.brandName} aria-label="VIA home, new search">
          VIA
        </Link>
        {IS_BETA && (
          <span style={styles.beta} title="VIA is in beta: features are subject to change.">
            Beta
          </span>
        )}
        <Clickable
          style={styles.fold}
          hoverStyle={Style.buttons.iconHover}
          onClick={() => setRailCollapsed(true)}
          aria-label="Fold the rail"
          title="Fold the rail"
        >
          <ChevronsLeftIcon size={14} strokeWidth={2.2} />
        </Clickable>
      </div>

      <Item
        to="/"
        icon={<PlusIcon size={15} strokeWidth={2.4} />}
        title="New search"
        style={styles.itemNew}
        hoverKey="new"
        hoveredKey={hoveredKey}
        hoverProps={hoverProps}
      />

      <h2 style={styles.heading}>
        Saved
        {saved.length > 0 && (
          <Link to="/saved" style={styles.headingLink}>
            All {saved.length}
          </Link>
        )}
      </h2>
      {saved.length === 0 ? (
        <p style={styles.headingNote}>Save a search to keep it here.</p>
      ) : (
        saved.slice(0, RAIL_LIST_LIMIT).map((search: SavedSearch) => (
          <Item
            key={search.id}
            to={`/saved/${search.id}`}
            icon={<StarIcon size={14} filled strokeWidth={1.5} />}
            title={search.name}
            subtitle={`${search.variants.length} variant${search.variants.length === 1 ? "" : "s"} · ${conditionNames(search)}`}
            hoverKey={`saved:${search.id}`}
            hoveredKey={hoveredKey}
            hoverProps={hoverProps}
          />
        ))
      )}

      <h2 style={styles.heading}>
        Recent
        {recent.length > 0 && (
          <Link to="/recent" style={styles.headingLink}>
            All {recent.length}
          </Link>
        )}
      </h2>
      {recent.length === 0 ? (
        <p style={styles.headingNote}>Searches you run show here.</p>
      ) : (
        recent.slice(0, RAIL_LIST_LIMIT).map((search) => {
          const current = isShowing(search);
          return (
            <Item
              key={search.searchedAt}
              to={resultsPath(
                search.variants,
                search.conditions.map((condition) => condition.conceptId),
              )}
              icon={<ClockIcon size={14} strokeWidth={2.2} />}
              title={describeVariants(search.variants)}
              titleStyle={styles.titleMono}
              subtitle={
                <>
                  {conditionNames(search)} · {current ? <span style={styles.now}>now</span> : describeSearchedAt(search.searchedAt)}
                </>
              }
              current={current}
              label={`Run again: ${search.variants.length} variant${search.variants.length === 1 ? "" : "s"}, ${conditionNames(search).toLowerCase() === "no phenotype" ? "no phenotype" : conditionNames(search)}, ${current ? "showing now" : describeSearchedAt(search.searchedAt)}`}
              hoverKey={`recent:${search.searchedAt}`}
              hoveredKey={hoveredKey}
              hoverProps={hoverProps}
            />
          );
        })
      )}

      <span style={styles.spacer} />

      <h2 style={styles.heading}>Workspace</h2>
      <Item
        to="/sources"
        icon={<DatabaseIcon size={14} strokeWidth={2.2} />}
        title="Data sources"
        titleStyle={styles.titlePlain}
        style={styles.itemRow}
        hoverKey="sources"
        hoveredKey={hoveredKey}
        hoverProps={hoverProps}
      />
      <Item
        to="/status"
        icon={<ActivityIcon size={14} strokeWidth={2.2} />}
        title="System status"
        titleStyle={styles.titlePlain}
        style={styles.itemRow}
        hoverKey="status"
        hoveredKey={hoveredKey}
        hoverProps={hoverProps}
      />
      <Item
        to="/usage"
        icon={<GaugeIcon size={14} strokeWidth={2.2} />}
        title="Usage"
        titleStyle={styles.titlePlain}
        style={styles.itemRow}
        trailing={
          meter ? (
            <span style={styles.meterValue} title={meter.detail} aria-label={`${meter.cost} this session`}>
              {meter.cost} this session
            </span>
          ) : undefined
        }
        hoverKey="usage"
        hoveredKey={hoveredKey}
        hoverProps={hoverProps}
      />
      <div style={styles.user}>
        <span style={styles.avatar} aria-hidden="true">
          {initials(userEmail)}
        </span>
        <span style={styles.email} title={userEmail}>
          {userEmail}
        </span>
      </div>
    </nav>
  );
}
