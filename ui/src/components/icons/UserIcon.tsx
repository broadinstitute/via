import { baseIconProps, type IconProps } from "./Icon";

export default function UserIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
