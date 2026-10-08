// Links out to a variant in public databases, by its chr-pos-ref-alt ID. Built here rather than
// sent by the API: they're a function of the ID alone, so every variant gets one, whether or not
// it's in the VAT.

export function gnomadVariantUrl(variant: string): string {
  return `https://gnomad.broadinstitute.org/variant/${variant}`;
}

export function clinvarSearchUrl(variant: string): string {
  return `https://www.ncbi.nlm.nih.gov/clinvar/?term=${variant}`;
}
