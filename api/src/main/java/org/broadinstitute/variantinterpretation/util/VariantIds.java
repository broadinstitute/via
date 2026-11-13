package org.broadinstitute.variantinterpretation.util;

/** Helpers for variant IDs in chrom-pos-ref-alt form, e.g. "8-11708582-C-T". */
public final class VariantIds {

  private VariantIds() {}

  /** Whether the variant is on chromosome Y, which phenotype-matched cohorts don't support. */
  public static boolean isChrY(String variant) {
    return variant != null && variant.startsWith("Y-");
  }
}
