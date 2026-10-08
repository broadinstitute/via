import { baseIconProps, type IconProps } from "./Icon";

interface SortIconProps extends IconProps {
  /** "none" draws both arrows, the resting state of a sortable column. */
  direction: "none" | "asc" | "desc";
}

// Filled triangles rather than stroked chevrons: at the 11px this is drawn at, two chevrons close
// into a diamond, while two solid triangles with a gap between them still read as "sort".
export default function SortIcon({ direction, ...props }: SortIconProps) {
  return (
    <svg {...baseIconProps(props)} fill="currentColor" stroke="none">
      {direction === "none" && (
        <>
          <path d="M12 3 L19 10 H5 Z" />
          <path d="M12 21 L5 14 H19 Z" />
        </>
      )}
      {direction === "asc" && <path d="M12 5 L21 16 H3 Z" />}
      {direction === "desc" && <path d="M12 19 L3 8 H21 Z" />}
    </svg>
  );
}
