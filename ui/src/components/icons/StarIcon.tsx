import { baseIconProps, type IconProps } from "./Icon";

/** A saved search. `filled` for one that is saved, outlined for the action of saving. */
export default function StarIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...baseIconProps(props)} fill={filled ? "currentColor" : "none"}>
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
    </svg>
  );
}
