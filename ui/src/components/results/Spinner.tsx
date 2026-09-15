import colors from "../../libs/colors";

export default function Spinner() {
  return (
    <span
      className="animate-spin"
      // A single accent-colored arc on an otherwise neutral ring.
      style={{
        display: "inline-block",
        width: 22,
        height: 22,
        border: `3px solid ${colors.borderStrong}`,
        borderTopColor: colors.textAccent,
        borderRadius: "50%",
      }}
      role="status"
      aria-label="Loading"
    />
  );
}
