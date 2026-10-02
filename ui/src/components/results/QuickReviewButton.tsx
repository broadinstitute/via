import * as Style from "../../libs/style";
import Clickable from "../common/Clickable";
import { CompareIcon } from "../icons";

interface QuickReviewButtonProps {
  onClick: () => void;
}

/** The call to action for Quick review, the same in every panel header that offers it. */
export default function QuickReviewButton({ onClick }: QuickReviewButtonProps) {
  return (
    <Clickable
      style={Style.buttons.primary}
      hoverStyle={Style.buttons.primaryHover}
      onClick={onClick}
      title="Compare each variant's phenotype-matched frequency with the cohort-wide one, one variant at a time"
    >
      <CompareIcon size={14} strokeWidth={2.2} aria-hidden="true" />
      Quick review
    </Clickable>
  );
}
