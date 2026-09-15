import type { SVGProps } from "react";

// Shared by every icon in this directory, so a single default (24x24 viewBox, round line caps,
// currentColor stroke) doesn't need repeating in each one. `size` sets width/height together,
// since none of our icons are ever non-square; anything else (className, strokeWidth,
// aria-hidden, etc.) passes straight through to the <svg>.
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill" | "width" | "height"> {
  size?: number;
}

export function baseIconProps({ size = 16, strokeWidth = 2, ...rest }: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...rest,
  };
}
