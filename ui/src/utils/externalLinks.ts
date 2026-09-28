// Links out to a variant in public databases, by its chr-pos-ref-alt ID. The same URLs the
// backend builds (VatLookupService) for variants in the VAT; these are for variants that aren't,
// which the backend has no record of and so returns no links for.

export function gnomadVariantUrl(variant: string): string {
  return `https://gnomad.broadinstitute.org/variant/${variant}`;
}

export function clinvarSearchUrl(variant: string): string {
  return `https://www.ncbi.nlm.nih.gov/clinvar/?term=${variant}`;
}
