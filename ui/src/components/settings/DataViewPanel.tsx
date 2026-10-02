import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import { setColumnHidden, setDataViewOptions, useDataViewOptions } from "../../utils/dataViewOptions";
import { hideableColumnsFor, TABLE_LABELS, type TableKey } from "../../utils/hideableColumns";
import Clickable from "../common/Clickable";
import Toggle from "../common/Toggle";

const styles = {
  title: {
    marginBottom: 6,
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
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
    overflow: "hidden",
  },
  // The whole row is the label, so clicking the text flips the switch too.
  row: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "11px 12px",
    cursor: "pointer",
  },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.textBody,
    fontSize: 12.5,
    fontWeight: 600,
  },
  description: {
    fontSize: 11.5,
    lineHeight: 1.45,
    color: colors.textSecondary,
  },
  note: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 1.5,
    color: colors.textMuted,
  },
  sectionTitle: {
    margin: "22px 0 4px",
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  tableHeading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "9px 12px",
    background: colors.surface1,
    borderBottom: `1px solid ${colors.border}`,
  },
  tableName: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.textBody,
  },
  showAll: {
    ...Style.buttons.accent,
    padding: "3px 8px",
    fontSize: 11,
  },
  columnGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
    gap: "6px 12px",
    padding: "10px 12px",
  },
  columnOption: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: colors.textBody,
    cursor: "pointer",
  },
} as const satisfies Record<string, CSSProperties>;

const TABLES: TableKey[] = ["cohort", "matched"];

export default function DataViewPanel() {
  const { showAllRows, hiddenColumns } = useDataViewOptions();
  const hidden = new Set(hiddenColumns);

  function showAllColumns(table: TableKey) {
    const keys = new Set(hideableColumnsFor(table).map((column) => column.key));
    setDataViewOptions({ hiddenColumns: hiddenColumns.filter((key) => !keys.has(key)) });
  }

  return (
    <>
      <h3 style={styles.title}>Data view</h3>
      <p style={styles.intro}>How the results tables are laid out. These apply right away and are remembered in this browser.</p>
      <ul style={styles.list}>
        <li>
          <label style={styles.row}>
            <span style={styles.text}>
              <span id="showAllRowsLabel" style={styles.name}>
                Show all rows
              </span>
              <span id="showAllRowsDescription" style={styles.description}>
                Lay out every variant in the tables at once and let the page scroll, instead of each table
                scrolling within a fixed height.
              </span>
            </span>
            <Toggle
              checked={showAllRows}
              onChange={(checked) => setDataViewOptions({ showAllRows: checked })}
              aria-labelledby="showAllRowsLabel"
              aria-describedby="showAllRowsDescription"
            />
          </label>
        </li>
      </ul>
      <p style={styles.note}>
        With many variants, a table can run well past one screen. The tables' own scrollbars come back when
        this is off.
      </p>

      <h4 style={styles.sectionTitle}>Columns</h4>
      <p style={styles.intro}>
        Untick a column to leave it out of a table. The variant itself, and each row's controls, always show.
      </p>
      {TABLES.map((table, index) => {
        const columns = hideableColumnsFor(table);
        const hiddenCount = columns.filter((column) => hidden.has(column.key)).length;
        return (
          <div key={table} style={{ ...styles.list, marginTop: index > 0 ? 10 : 0 }}>
            <div style={styles.tableHeading}>
              <span style={styles.tableName}>{TABLE_LABELS[table]}</span>
              {hiddenCount > 0 && (
                <Clickable
                  style={styles.showAll}
                  hoverStyle={Style.buttons.accentHover}
                  onClick={() => showAllColumns(table)}
                  aria-label={`Show all columns in ${TABLE_LABELS[table]}`}
                >
                  Show all
                </Clickable>
              )}
            </div>
            <div style={styles.columnGrid} role="group" aria-label={`${TABLE_LABELS[table]} columns`}>
              {columns.map((column) => (
                <label key={column.key} style={styles.columnOption}>
                  <input
                    type="checkbox"
                    style={Style.table.checkbox}
                    checked={!hidden.has(column.key)}
                    onChange={(event) => setColumnHidden(column.key, !event.target.checked)}
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
