import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ConditionConcept } from "../../api/conditions";
import colors, { alpha } from "../../libs/colors";
import { useFocus } from "../../libs/hooks";
import * as Style from "../../libs/style";
import { describeAlternatives } from "../../utils/phenotypes";
import { createSavedSearch, NAME_LIMIT, normalizeName, type SavedSearch } from "../../utils/savedSearches";
import Clickable from "../common/Clickable";
import { CloseIcon, StarIcon } from "../icons";

const styles = {
  scrim: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: alpha(colors.textPrimary, 0.35),
  },
  dialog: {
    ...Style.elements.panel,
    display: "flex",
    flexDirection: "column",
    width: 440,
    maxWidth: "100%",
    boxShadow: Style.shadows.raised,
    outline: "none",
  },
  header: {
    ...Style.elements.panelHeader,
    justifyContent: "space-between",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "16px 20px",
  },
  summary: {
    margin: 0,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    marginBottom: 4,
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: 600,
  },
  textarea: {
    ...Style.inputs.text,
    minHeight: 56,
    resize: "vertical",
    lineHeight: 1.5,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    padding: "12px 20px",
    background: colors.surface1,
    borderTop: `1px solid ${colors.border}`,
  },
} as const satisfies Record<string, CSSProperties>;

interface SaveSearchDialogProps {
  variants: string[];
  phenotypes: ConditionConcept[];
  onClose: () => void;
  /** Called with the new record once it's saved; the dialog has already closed. */
  onSaved: (search: SavedSearch) => void;
}

/** Asks for a name (and optional notes) and saves the criteria under it. */
export default function SaveSearchDialog({ variants, phenotypes, onClose, onSaved }: SaveSearchDialogProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const { focused: nameFocused, focusProps: nameFocusProps } = useFocus();
  const { focused: notesFocused, focusProps: notesFocusProps } = useFocus();
  const canSave = normalizeName(name).length > 0;

  useEffect(() => nameRef.current?.focus(), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function save() {
    if (!canSave) return;
    const search = createSavedSearch({
      name,
      notes: notes.trim(),
      variants,
      conditions: phenotypes.map(({ conceptId, name: conditionName }) => ({ conceptId, name: conditionName })),
    });
    onSaved(search);
  }

  return (
    // Only a click that starts and ends on the scrim itself closes, not one inside the dialog.
    <div style={styles.scrim} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="saveSearchTitle"
        style={styles.dialog}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div style={styles.header}>
          <h2 id="saveSearchTitle" style={Style.elements.panelTitle}>
            Save search
          </h2>
          <Clickable style={Style.buttons.icon} hoverStyle={Style.buttons.iconHover} onClick={onClose} aria-label="Close" title="Close">
            <CloseIcon size={14} strokeWidth={2.5} />
          </Clickable>
        </div>
        <div style={styles.body}>
          <p style={styles.summary}>
            {variants.length} variant{variants.length === 1 ? "" : "s"}
            {phenotypes.length > 0 && ` · ${describeAlternatives(phenotypes.map((phenotype) => phenotype.name))}`}. Saved
            searches keep what was searched for, not results.
          </p>
          <div>
            <label htmlFor="saveSearchName" style={styles.label}>
              Name
            </label>
            <input
              id="saveSearchName"
              ref={nameRef}
              type="text"
              value={name}
              maxLength={NAME_LIMIT}
              placeholder="e.g. LQTS clinic panel"
              onChange={(event) => setName(event.target.value)}
              style={{ ...Style.inputs.text, ...(nameFocused ? Style.inputs.focused : undefined) }}
              {...nameFocusProps}
            />
          </div>
          <div>
            <label htmlFor="saveSearchNotes" style={styles.label}>
              Notes <span style={{ fontWeight: 400, color: colors.textMuted }}>(optional)</span>
            </label>
            <textarea
              id="saveSearchNotes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              style={{ ...styles.textarea, ...(notesFocused ? Style.inputs.focused : undefined) }}
              {...notesFocusProps}
            />
          </div>
        </div>
        <div style={styles.footer}>
          <Clickable style={Style.buttons.secondary} hoverStyle={Style.buttons.secondaryHover} onClick={onClose}>
            Cancel
          </Clickable>
          <Clickable
            type="submit"
            style={Style.buttons.primary}
            hoverStyle={Style.buttons.primaryHover}
            disabledStyle={Style.buttons.disabled}
            disabled={!canSave}
          >
            <StarIcon size={13} strokeWidth={2.2} aria-hidden="true" />
            Save
          </Clickable>
        </div>
      </form>
    </div>
  );
}
