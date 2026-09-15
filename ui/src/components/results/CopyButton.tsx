import { useState } from "react";
import { CheckIcon, CopyIcon } from "../icons";
import styles from "./CopyButton.module.css";

interface CopyButtonProps {
  getText: () => string;
  label: string;
}

export default function CopyButton({ getText, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard access can be denied by the browser; silently ignore.
    }
  }

  return (
    <button
      type="button"
      className={`${styles.button} ${copied ? styles.copied : ""}`}
      onClick={handleClick}
      title={label}
      aria-label={label}
    >
      {copied ? <CheckIcon size={12} strokeWidth={2.5} /> : <CopyIcon size={12} />}
    </button>
  );
}
