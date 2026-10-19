import { baseIconProps, type IconProps } from "./Icon";

/** Fold the rail. */
export default function ChevronsLeftIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
    </svg>
  );
}
