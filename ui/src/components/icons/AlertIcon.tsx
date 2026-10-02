import { baseIconProps, type IconProps } from "./Icon";

/** A rounded triangle with an exclamation mark: something went wrong. */
export default function AlertIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
