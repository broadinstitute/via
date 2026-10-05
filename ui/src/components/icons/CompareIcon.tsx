import { baseIconProps, type IconProps } from "./Icon";

/** A frame split down the middle with rows on either side: the head-to-head comparison, in miniature. */
export default function CompareIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M12 4v16" />
      <path d="M6 9h3M6 12h3M6 15h3M15 9h3M15 12h3M15 15h3" />
    </svg>
  );
}
