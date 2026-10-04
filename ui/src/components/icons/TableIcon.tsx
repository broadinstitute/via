import { baseIconProps, type IconProps } from "./Icon";

/** A grid with a header row: the table view. */
export default function TableIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 10v10" />
    </svg>
  );
}
