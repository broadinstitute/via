# data

Sample data for prototyping against the Variant Annotation Table (VAT) schema.

## Files

- `foxtrot_v4_2025_07_29_vat_v9_r2_p2_schema.json` - BigQuery table schema
  (field name, type, mode) for the VAT export, 114 fields covering variant
  identity, GVS allele counts/frequencies (overall and per-subpopulation),
  gnomAD frequencies, transcript/consequence annotations, ClinVar, OMIM, and
  in-silico predictors (REVEL, SpliceAI, GERP, LoF).
- `synthetic/synthetic_foxtrot_vat.ndjson` - 1,000 synthetic rows matching the
  schema above, one JSON object per line. Values are randomly generated and
  do not correspond to real variants or samples; use this for local
  development and testing against the VAT shape without needing access to a
  real VAT export.
- `synthetic/generate_vat_synthetic.py` - the script that generates the
  NDJSON file above. Regenerate or produce a different row count with:

  ```
  python3 data/synthetic/generate_vat_synthetic.py \
      --rows 1000 \
      --out data/synthetic/synthetic_foxtrot_vat.ndjson \
      --schema data/foxtrot_v4_2025_07_29_vat_v9_r2_p2_schema.json
  ```

  Passing `--schema` validates that the generated rows contain exactly the
  fields defined in the schema (no missing or extra fields) and orders the
  output keys to match.
