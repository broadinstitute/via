import { baseIconProps, type IconProps } from "./Icon";

/** A cog: the app's settings. */
export default function GearIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M9.71 1.75 L14.29 1.75 L14.27 4.75 L17.14 6.41 L19.73 4.89 L22.02 8.86 L19.42 10.34 L19.42 13.66 L22.02 15.14 L19.73 19.11 L17.14 17.59 L14.27 19.25 L14.29 22.25 L9.71 22.25 L9.73 19.25 L6.86 17.59 L4.27 19.11 L1.98 15.14 L4.58 13.66 L4.58 10.34 L1.98 8.86 L4.27 4.89 L6.86 6.41 L9.73 4.75Z" />
    </svg>
  );
}
