import { baseIconProps, type IconProps } from "./Icon";

export default function GaugeIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <path d="M3.5 16 A9 9 0 1 1 20.5 16" />
      <path d="M12 16 L16.2 9.8" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}
