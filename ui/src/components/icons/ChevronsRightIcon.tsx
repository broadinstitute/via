import { baseIconProps, type IconProps } from "./Icon";

/** Unfold the rail. */
export default function ChevronsRightIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />
    </svg>
  );
}
