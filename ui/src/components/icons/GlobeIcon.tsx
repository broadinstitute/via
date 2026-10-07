import { baseIconProps, type IconProps } from "./Icon";

/** A globe with its meridian and equator: a population, grouped by where its ancestry traces to. */
export default function GlobeIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13.5 13.5 0 0 1 0 18a13.5 13.5 0 0 1 0-18z" />
    </svg>
  );
}
