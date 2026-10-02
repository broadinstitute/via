import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import { BigQueryStatusList, useBigQueryStatus } from "../common/BigQueryStatus";
import Clickable from "../common/Clickable";

const styles = {
  heading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  intro: {
    marginBottom: 14,
    fontSize: 12,
    lineHeight: 1.5,
    color: colors.textSecondary,
  },
} as const satisfies Record<string, CSSProperties>;

export default function SystemStatusPanel() {
  const { status, error, loading, check } = useBigQueryStatus();

  return (
    <>
      <div style={styles.heading}>
        <h3 style={styles.title}>System status</h3>
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
      <p style={styles.intro}>
        The BigQuery tables VIA queries, and whether this workspace's credentials can read them.
      </p>
      <BigQueryStatusList status={status} error={error} loading={loading} />
    </>
  );
}
