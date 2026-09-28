import type { CSSProperties } from "react";

const style: CSSProperties = { fontStyle: "italic" };

/**
 * The program's name, italicized as it is everywhere in the app. Put a possessive's "'s" after it,
 * outside the italics. Native `title` tooltips can't be styled, so they spell the name plainly.
 */
export default function AllOfUs() {
  return <em style={style}>All of Us</em>;
}
