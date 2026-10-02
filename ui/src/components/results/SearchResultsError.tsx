import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import colors from "../../libs/colors";
import { useHover } from "../../libs/hooks";
import * as Style from "../../libs/style";
import { BigQueryStatusList, useBigQueryStatus } from "../common/BigQueryStatus";
import Clickable from "../common/Clickable";
import { AlertIcon } from "../icons";

const styles = {
  card: {
    ...Style.elements.panel,
    width: 640,
    maxWidth: "100%",
    margin: "40px auto 0",
    boxShadow: Style.shadows.panel,
  },
  intro: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: "36px 28px 28px",
    textAlign: "center",
  },
  iconWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: colors.bgDanger,
    color: colors.textDanger,
  },
  title: {
    margin: "6px 0 0",
    fontSize: 20,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  lede: {
    maxWidth: 440,
    fontSize: 13,
    lineHeight: 1.55,
    color: colors.textSecondary,
  },
  message: {
    ...Style.elements.mono,
    alignSelf: "stretch",
    marginTop: 6,
    padding: "10px 14px",
    borderRadius: Style.radius,
    background: colors.bgDanger,
    color: colors.textDanger,
    lineHeight: 1.5,
    textAlign: "left",
    wordBreak: "break-word",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  action: {
    padding: "8px 16px",
    fontSize: 12.5,
    fontWeight: 700,
  },
  // The secondary button, as a Link. Its base style is a <button>'s, so the Link needs the
  // inline-flex and text-decoration that a button gets for free.
  secondaryLink: {
    ...Style.buttons.secondary,
    display: "inline-flex",
    alignItems: "center",
    textDecoration: "none",
  },
  status: {
    padding: "18px 28px 24px",
    background: colors.surface1,
    borderTop: `1px solid ${colors.border}`,
  },
  statusHeading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  statusIntro: {
    marginBottom: 12,
    fontSize: 12,
    lineHeight: 1.5,
    color: colors.textSecondary,
  },
} as const satisfies Record<string, CSSProperties>;

interface SearchResultsErrorProps {
  /** What went wrong, as the API client reported it. */
  message: string;
  onRetry: () => void;
}

/**
 * Stands in for the whole results page when the search request fails. Alongside the error it
 * runs the BigQuery table check, since a table this workspace can't read is the usual reason a
 * search fails -- and the one the user can do something about.
 */
export default function SearchResultsError({ message, onRetry }: SearchResultsErrorProps) {
  const { status, error, loading, check } = useBigQueryStatus();
  const { hovered: newSearchHovered, hoverProps: newSearchHoverProps } = useHover();

  return (
    <section style={styles.card} aria-labelledby="searchErrorTitle">
      <div style={styles.intro}>
        <div style={styles.iconWrap}>
          <AlertIcon size={24} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <h1 id="searchErrorTitle" style={styles.title}>
          Couldn't load search results
        </h1>
        <p style={styles.lede}>
          VIA asked the server for this search's results and didn't get them back. Check the table
          status below, then try the search again.
        </p>
        <div role="alert" style={styles.message}>
          {message}
        </div>
        <div style={styles.actions}>
          <Clickable
            style={{ ...Style.buttons.primary, ...styles.action }}
            hoverStyle={Style.buttons.primaryHover}
            onClick={onRetry}
          >
            Try again
          </Clickable>
          <Link
            to="/"
            style={{
              ...styles.secondaryLink,
              ...styles.action,
              ...(newSearchHovered ? Style.buttons.secondaryHover : undefined),
            }}
            {...newSearchHoverProps}
          >
            New search
          </Link>
        </div>
      </div>

      <div style={styles.status}>
        <div style={styles.statusHeading}>
          <h2 style={styles.statusTitle}>BigQuery status</h2>
          <Clickable
            style={Style.buttons.accent}
            hoverStyle={Style.buttons.accentHover}
            disabledStyle={Style.buttons.disabled}
            onClick={check}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Clickable>
        </div>
        <p style={styles.statusIntro}>
          The tables this search reads from, and whether this workspace's credentials can read them.
        </p>
        <BigQueryStatusList status={status} error={error} loading={loading} />
      </div>
    </section>
  );
}
