import { baseIconProps, type IconProps } from "./Icon";

export default function InfoIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <circle cx="12" cy="12" r="10" />
      {/* Taller and heavier than the ring, so the "i" stays legible at the ~15px it's shown at.
          The dot is a zero-length round-capped line, so its size follows the stroke width. */}
      <path d="M12 17v-5.5" strokeWidth={2.6} />
      <path d="M12 7.5h.01" strokeWidth={3} />
    </svg>
  );
}
