import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import colors, { alpha } from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import Clickable from "../common/Clickable";
import { CloseIcon } from "../icons";
import SystemStatusPanel from "./SystemStatusPanel";

/** Each settings panel: a nav entry and what it shows. Add new panels here. */
const PANELS: { id: string; label: string; render: () => ReactNode }[] = [
  { id: "status", label: "System status", render: () => <SystemStatusPanel /> },
];

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
    width: 760,
    maxWidth: "100%",
    maxHeight: "calc(100vh - 32px)",
    boxShadow: Style.shadows.raised,
  },
  header: {
    ...Style.elements.panelHeader,
    justifyContent: "space-between",
  },
  body: {
    display: "flex",
    minHeight: 320,
    overflow: "hidden",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    width: 170,
    flexShrink: 0,
    padding: 10,
    background: colors.surface1,
    borderRight: `1px solid ${colors.border}`,
  },
  navItem: {
    padding: "7px 10px",
    border: "none",
    borderRadius: 6,
    background: "none",
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 500,
    textAlign: "left",
    cursor: "pointer",
  },
  navItemHovered: {
    color: colors.textAccent,
  },
  navItemSelected: {
    background: colors.bgAccent,
    color: colors.textAccent,
    fontWeight: 600,
  },
  content: {
    flex: 1,
    minWidth: 0,
    padding: "16px 20px",
    overflowY: "auto",
  },
} as const satisfies Record<string, CSSProperties>;

interface SettingsDialogProps {
  onClose: () => void;
}

export default function SettingsDialog({ onClose }: SettingsDialogProps) {
  const [selectedId, setSelectedId] = useState(PANELS[0].id);
  const { hoveredKey, hoverProps } = useHoveredKey<string>();
  const dialogRef = useRef<HTMLDivElement>(null);
  const selected = PANELS.find((panel) => panel.id === selectedId) ?? PANELS[0];

  // Separate from the Escape listener, which re-subscribes whenever onClose changes identity;
  // refocusing then would pull focus off whatever the user had moved it to.
  useEffect(() => dialogRef.current?.focus(), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    // Only a click that starts and ends on the scrim itself closes, not one inside the dialog.
    <div style={styles.scrim} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settingsTitle"
        tabIndex={-1}
        style={{ ...styles.dialog, outline: "none" }}
      >
        <div style={styles.header}>
          <h2 id="settingsTitle" style={Style.elements.panelTitle}>
            Settings
          </h2>
          <Clickable
            style={Style.buttons.icon}
            hoverStyle={Style.buttons.iconHover}
            onClick={onClose}
            aria-label="Close settings"
            title="Close"
          >
            <CloseIcon size={14} strokeWidth={2.5} />
          </Clickable>
        </div>
        <div style={styles.body}>
          <nav style={styles.nav} aria-label="Settings sections">
            {PANELS.map((panel) => (
              <button
                key={panel.id}
                type="button"
                aria-current={panel.id === selected.id ? "page" : undefined}
                onClick={() => setSelectedId(panel.id)}
                {...hoverProps(panel.id)}
                style={{
                  ...styles.navItem,
                  ...(hoveredKey === panel.id ? styles.navItemHovered : undefined),
                  ...(panel.id === selected.id ? styles.navItemSelected : undefined),
                }}
              >
                {panel.label}
              </button>
            ))}
          </nav>
          <section style={styles.content} aria-label={selected.label}>
            {selected.render()}
          </section>
        </div>
      </div>
    </div>
  );
}
