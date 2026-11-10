import InfoLabel from "../common/InfoLabel";

// Placeholder wording; the real explanation is still to be written.
const CHRY_TOOLTIP =
  "Placeholder explanation: phenotype-matched cohorts aren't available for chromosome Y variants. " +
  "The exact reason is still to be written.";

/**
 * Stands in for every phenotype-matched figure of a chromosome Y variant, in the table and in
 * Review, with the reason on hover.
 */
export default function ChrYUnsupported() {
  return <InfoLabel tooltip={CHRY_TOOLTIP}>chrY is not supported for phenotype-matched cohorts</InfoLabel>;
}
