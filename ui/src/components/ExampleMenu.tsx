import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import colors from "../libs/colors";
import { useHover, useHoveredKey } from "../libs/hooks";
import * as Style from "../libs/style";
import type { UseCase } from "../utils/useCases";
import { ChevronDownIcon } from "./icons";

const styles = {
  wrap: {
    position: "relative",
    flexShrink: 0,
  },
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: 0,
    border: "none",
    background: "none",
    color: colors.textAccent,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  triggerHover: {
    textDecoration: "underline",
  },
  // Right-aligned under the link, which sits at the right of its row.
  menu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    zIndex: 10,
    width: 300,
    margin: 0,
    padding: 4,
    listStyle: "none",
    background: colors.surface2,
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
    boxShadow: Style.shadows.raised,
  },
  item: {
    display: "block",
    width: "100%",
    padding: "8px 10px",
    border: "none",
    borderRadius: 6,
    background: "none",
    textAlign: "left",
    cursor: "pointer",
  },
  itemActive: {
    background: colors.surface1,
  },
  itemTitle: {
    display: "block",
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: 600,
  },
  itemDescription: {
    display: "block",
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 1.4,
  },
} as const satisfies Record<string, CSSProperties>;

interface ExampleMenuProps {
  examples: UseCase[];
  onPick: (example: UseCase) => void;
}

/** "Try an example", as a menu of the curated demo searches. */
export default function ExampleMenu({ examples, onPick }: ExampleMenuProps) {
  const [open, setOpen] = useState(false);
  const { hovered, hoverProps } = useHover();
  const { hoveredKey, hoverProps: itemHoverProps } = useHoveredKey<string>();
  // Highlighted for keyboard focus too, not just the pointer, so arrowing through shows where you are.
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Into the menu when it opens, so the arrow keys work straight away.
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsidePress);
    return () => document.removeEventListener("mousedown", closeOnOutsidePress);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleMenuKeyDown(event: KeyboardEvent) {
    const items = itemRefs.current.filter((item) => item !== null);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusAt(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusAt(items.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} style={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        style={{ ...styles.trigger, ...(hovered || open ? styles.triggerHover : undefined) }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        {...hoverProps}
      >
        Try an example
        <ChevronDownIcon size={11} strokeWidth={2.5} aria-hidden="true" />
      </button>
      {open && (
        <ul id={menuId} role="menu" aria-label="Example searches" style={styles.menu} onKeyDown={handleMenuKeyDown}>
          {examples.map((example, index) => (
            <li key={example.key} role="none">
              <button
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitem"
                style={{
                  ...styles.item,
                  ...(hoveredKey === example.key || focusedKey === example.key ? styles.itemActive : undefined),
                }}
                onFocus={() => setFocusedKey(example.key)}
                onBlur={() => setFocusedKey(null)}
                onClick={() => {
                  setOpen(false);
                  onPick(example);
                }}
                {...itemHoverProps(example.key)}
              >
                <span style={styles.itemTitle}>{example.title}</span>
                <span style={styles.itemDescription}>{example.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
