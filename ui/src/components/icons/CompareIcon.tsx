import { baseIconProps, type IconProps } from "./Icon";

/** Two overlapping circles: one cohort against another. */
export default function CompareIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <circle cx="9" cy="12" r="6.5" />
      <circle cx="15" cy="12" r="6.5" />
    </svg>
  );
}
