import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import Clickable from "../Clickable";
import { PlusIcon } from "../icons";

interface PhenotypeFilterRequiredProps {
  message: string;
  buttonLabel: string;
  onAddPhenotypeFilter: () => void;
}

export default function PhenotypeFilterRequired({
  message,
  buttonLabel,
  onAddPhenotypeFilter,
}: PhenotypeFilterRequiredProps) {
  return (
    <div
      // minHeight matches the scroller in ParticipantMatchedVariantsPanel, so this empty-state
      // prompt takes up roughly the same footprint as the populated table would.
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        minHeight: 346,
        padding: "56px 20px",
        color: colors.textSecondary,
        fontSize: 12.5,
        textAlign: "center",
      }}
    >
      <span>{message}</span>
      <Clickable
        style={{ ...Style.buttons.primary, padding: "8px 14px", fontSize: 12.5, fontWeight: 700 }}
        hoverStyle={Style.buttons.primaryHover}
        onClick={onAddPhenotypeFilter}
      >
        <PlusIcon size={12} strokeWidth={2.5} />
        {buttonLabel}
      </Clickable>
    </div>
  );
}
