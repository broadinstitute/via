import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ConditionConcept } from "../api/conditions";
import colors from "../libs/colors";
import { useFocus } from "../libs/hooks";
import * as Style from "../libs/style";
import AllOfUs from "../components/common/AllOfUs";
import Clickable from "../components/common/Clickable";
import { StarIcon } from "../components/icons";
import SearchForm from "../components/SearchForm";
import TopBar from "../components/shell/TopBar";
import { formatInt } from "../utils/format";
import { searchConceptIds } from "../utils/phenotypes";
import { describeSearchedAt } from "../utils/recentSearches";
import { deleteSavedSearch, normalizeName, updateSavedSearch, useSavedSearch, type SavedSearch } from "../utils/savedSearches";
import { parseVariantsText, resultsPath } from "../utils/variants";
import { SAVED_PARAM } from "./SearchResultsPage";

const styles = {
  main: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 20,
    padding: "24px 28px 48px",
  },
  form: {
    flex: "999 1 520px",
    minWidth: 0,
    maxWidth: 800,
  },
  aside: {
    ...Style.elements.panel,
    flex: "1 1 280px",
    minWidth: 0,
    maxWidth: 420,
    boxShadow: Style.shadows.panel,
  },
  asideHeader: {
    ...Style.elements.panelHeader,
    justifyContent: "space-between",
    gap: 10,
  },
  asideNote: {
    padding: "10px 14px",
    background: colors.surface1,
    borderTop: `1px solid ${colors.border}`,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 1.5,
  },
  table: {
    ...Style.table.base,
    borderCollapse: "collapse",
  },
  th: {
    padding: "7px 14px",
    textAlign: "left",
    background: colors.surface1,
    borderBottom: `1px solid ${colors.border}`,
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  td: {
    padding: "8px 14px",
    borderBottom: `1px solid ${colors.border}`,
    color: colors.textBody,
  },
  right: {
    textAlign: "right",
  },
  empty: {
    padding: "16px 14px",
    color: colors.textSecondary,
    fontSize: 12,
  },
  label: {
    display: "block",
    marginBottom: 4,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: 600,
  },
  textarea: {
    ...Style.inputs.text,
    minHeight: 56,
    resize: "vertical",
    lineHeight: 1.5,
  },
  edited: {
    padding: "2px 8px",
    borderRadius: 999,
    background: colors.bgWarning,
    color: colors.textWarning,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  missing: {
    padding: "32px 20px",
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 13,
  },
  deleteButton: {
    ...Style.buttons.secondary,
    color: colors.textDanger,
  },
  deleteConfirm: {
    ...Style.buttons.primary,
    background: colors.textDanger,
  },
} as const satisfies Record<string, CSSProperties>;

/** A saved condition as the form's concept: the estimate isn't kept, so the chip shows none. */
function toConcepts(search: SavedSearch): ConditionConcept[] {
  return search.conditions.map(({ conceptId, name }) => ({ conceptId, name, estimatedParticipantCount: null }));
}

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * A saved search, opened from the rail: its criteria in the form, ready to run or change, with
 * its name and notes beneath, and the log of its runs beside it. Changes stay unsaved until
 * "Save changes"; Run always runs what's in the form.
 */
export default function SavedSearchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const saved = useSavedSearch(id);
  const [variants, setVariants] = useState("");
  const [phenotypes, setPhenotypes] = useState<ConditionConcept[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { focused: nameFocused, focusProps: nameFocusProps } = useFocus();
  const { focused: notesFocused, focusProps: notesFocusProps } = useFocus();

  // The form starts from the record, and starts over when another saved search is opened.
  useEffect(() => {
    if (!saved) return;
    setVariants(saved.variants.join("\n"));
    setPhenotypes(toConcepts(saved));
    setName(saved.name);
    setNotes(saved.notes);
    setConfirmingDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.id]);

  if (!saved) {
    return (
      <>
        <TopBar title="Saved search" />
        <p style={styles.missing}>
          This saved search no longer exists. <Link to="/saved">See all saved searches</Link>
        </p>
      </>
    );
  }

  const parsedVariants = parseVariantsText(variants);
  const dirty =
    parsedVariants.join("\n") !== saved.variants.join("\n") ||
    searchConceptIds(phenotypes).join(",") !== saved.conditions.map((c) => c.conceptId).join(",") ||
    normalizeName(name) !== saved.name ||
    notes.trim() !== saved.notes;
  const canSaveChanges = dirty && normalizeName(name).length > 0;

  function saveChanges() {
    if (!canSaveChanges) return;
    updateSavedSearch(saved!.id, {
      name,
      notes: notes.trim(),
      variants: parsedVariants,
      conditions: phenotypes.map(({ conceptId, name: conditionName }) => ({ conceptId, name: conditionName })),
    });
  }

  function run() {
    navigate(`${resultsPath(parsedVariants, searchConceptIds(phenotypes))}&${SAVED_PARAM}=${encodeURIComponent(saved!.id)}`);
  }

  const lastRun = saved.runs[0];

  return (
    <>
      <TopBar
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <StarIcon size={14} filled strokeWidth={1.5} style={{ color: colors.textAccent }} aria-hidden="true" />
            {saved.name}
          </span>
        }
        lede={
          <>
            Saved {DATE.format(saved.createdAt)}
            {lastRun && ` · last run ${describeSearchedAt(lastRun.at)}`}
            {dirty && (
              <>
                {" "}
                <span style={styles.edited}>Edited</span>
              </>
            )}
          </>
        }
        actions={
          confirmingDelete ? (
            <>
              <span style={{ fontSize: 12, color: colors.textSecondary }}>Delete this saved search?</span>
              <Clickable style={Style.buttons.secondary} hoverStyle={Style.buttons.secondaryHover} onClick={() => setConfirmingDelete(false)}>
                Keep
              </Clickable>
              <Clickable
                style={styles.deleteConfirm}
                hoverStyle={Style.buttons.primaryHover}
                onClick={() => {
                  deleteSavedSearch(saved.id);
                  navigate("/saved");
                }}
              >
                Delete
              </Clickable>
            </>
          ) : (
            <Clickable style={styles.deleteButton} hoverStyle={Style.buttons.secondaryHover} onClick={() => setConfirmingDelete(true)}>
              Delete
            </Clickable>
          )
        }
      />
      <main style={styles.main}>
        <div style={styles.form}>
          <SearchForm
            variants={variants}
            onVariantsChange={setVariants}
            phenotypes={phenotypes}
            onPhenotypesChange={setPhenotypes}
            onSearch={run}
            searchLabel="Run"
            secondaryActions={
              <Clickable
                style={Style.buttons.accent}
                hoverStyle={Style.buttons.accentHover}
                disabledStyle={Style.buttons.disabled}
                disabled={!canSaveChanges}
                onClick={saveChanges}
              >
                Save changes
              </Clickable>
            }
          >
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="savedSearchName" style={styles.label}>
                Name
              </label>
              <input
                id="savedSearchName"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                style={{ ...Style.inputs.text, ...(nameFocused ? Style.inputs.focused : undefined) }}
                {...nameFocusProps}
              />
            </div>
            <div>
              <label htmlFor="savedSearchNotes" style={styles.label}>
                Notes
              </label>
              <textarea
                id="savedSearchNotes"
                value={notes}
                placeholder="What this search is for, or what to compare between runs"
                onChange={(event) => setNotes(event.target.value)}
                style={{ ...styles.textarea, ...(notesFocused ? Style.inputs.focused : undefined) }}
                {...notesFocusProps}
              />
            </div>
          </SearchForm>
        </div>

        <aside style={styles.aside} aria-labelledby="savedRunsHeading">
          <div style={styles.asideHeader}>
            <h2 id="savedRunsHeading" style={Style.elements.panelTitle}>
              Runs
            </h2>
            <span style={{ fontSize: 11.5, color: colors.textSecondary }}>
              {saved.runs.length === 0 ? "none yet" : `${saved.runs.length} since saved`}
            </span>
          </div>
          {saved.runs.length === 0 ? (
            <p style={styles.empty}>Run the search and each run is logged here with its matched participant count.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>When</th>
                  <th style={{ ...styles.th, ...styles.right }}>Matched</th>
                </tr>
              </thead>
              <tbody>
                {saved.runs.map((run) => (
                  <tr key={run.at}>
                    <td style={styles.td}>{describeSearchedAt(run.at)}</td>
                    <td style={{ ...styles.td, ...styles.right, ...(run.matchedCount === null ? Style.elements.notAvailable : undefined) }}>
                      {run.matchedCount === null ? "—" : formatInt(run.matchedCount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={styles.asideNote}>
            A run reads the current <AllOfUs /> release; results aren't stored. Matched counts are kept so a change
            between releases shows here.
          </p>
        </aside>
      </main>
    </>
  );
}
