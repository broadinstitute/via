import { baseIconProps, type IconProps } from "./Icon";

/** SearchIcon with a slash through the lens: searched for, nothing found. */
export default function SearchOffIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="m7.5 7.5 7 7" />
    </svg>
  );
}
