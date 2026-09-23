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

## Condition lookup fixture

Synthetic fixture for the free-text → condition `concept_id` → `person_id`
lookup described in `handoffs/HANDOFF_condition_lookup.md`. Three tables,
because that is all the condition-domain pipeline touches, plus one variant
table that exists solely to exercise `SAFE_CAST`.

None of this is real data. Every count is invented and every `concept_id` is
allocated in `9_000_000`–`9_099_999`, so no real OHDSI concept ID appears
anywhere. That is deliberate: the implementation discovers all concept IDs at
runtime, so an ID accidentally hardcoded from this fixture fails loudly against
the real CDR instead of quietly querying the wrong concept.

### Files

| Schema | Rows | Table |
|---|---|---|
| `cb_criteria_schema.json` | `synthetic/synthetic_cb_criteria.ndjson` (13) | `cb_criteria` |
| `cb_criteria_string_count_schema.json` | `synthetic/synthetic_cb_criteria_string_count.ndjson` (13) | `cb_criteria_string_count` |
| `concept_ancestor_schema.json` | `synthetic/synthetic_concept_ancestor.ndjson` (18) | `concept_ancestor` |
| `condition_occurrence_schema.json` | `synthetic/synthetic_condition_occurrence.ndjson` (4,409) | `condition_occurrence` |

`cb_criteria` carries the six columns the pipeline reads plus the ones present
but unused in the real table, so the startup `INFORMATION_SCHEMA` assertion sees
a realistic column list. `cb_criteria_string_count` is the same 13 rows with
`est_count` typed `STRING` — after `SAFE_CAST` both tables must produce
identical results, and that equivalence is the assertion.

### Regenerating

```
python3 data/synthetic/generate_condition_lookup_synthetic.py \
    --out-dir data/synthetic \
    --schema-dir data
```

Deterministic given `--seed` (default 42). Before writing anything, the script
recomputes the expected results from §6.6 of the handoff — search ranking and
dedup, the stopword regression, `SEARCH()` vs `LIKE` divergence, and the cohort
counts — and refuses to write if any of them no longer hold. A fixture that
drifts turns those assertions into flakes, so this fails closed;
`--skip-verify` overrides it.

### Loading

```
DEV_DATASET=<project>:<dataset>

for t in cb_criteria cb_criteria_string_count concept_ancestor condition_occurrence; do
  bq load --source_format=NEWLINE_DELIMITED_JSON --replace \
      "$DEV_DATASET.$t" \
      "data/synthetic/synthetic_$t.ndjson" \
      "data/${t}_schema.json"
done
```

### What the fixture is built around

`cb_criteria` shape:

- **9000010 appears twice** at different `path` values, identical in every
  projected column. The search dedups only because `id` and `path` are excluded
  from the `SELECT`; adding either back reintroduces the duplicate.
- **One group row with `concept_id = NULL`**, whose `full_text` deliberately
  matches the fallot searches. The `concept_id IS NOT NULL` filter is the only
  thing keeping it out of the results.
- **`est_count` of `-1` (9000015) and `NULL` (9000016)** sit on their own
  concepts rather than on concepts that already have a normal row — otherwise
  `SELECT DISTINCT` would not collapse them and they would break the
  appears-once assertion.
- **9000018 "Fallot tetralogy, repaired"** contains no `of` in any form. It is
  the stopword regression: requiring the literal token `of` drops it, which is
  the inverted-word-order case token matching exists to catch.

Cohort counts, exact by construction:

| Seed | Persons | Why |
|---|---|---|
| `[9000010]` | 49 | 40 + 6 + 3 via descendant expansion; seed-only matching gives 40 |
| `[9000001]` | 60 | also pulls in Pentalogy — the "don't seed on a parent" failure, made visible |
| `[9000030]` | 1,200 | high-prevalence anchor |
| `[9000031]` | 180 | subset of the above |

9000010's `est_count` is **47** against a true cohort of **49**. That mismatch
is intentional: `est_count` is an estimate in the real table, and a sanity check
should tolerate small divergence while still catching gross error.

9000014, 9000015, 9000016 and 9000018 get self-rows in `concept_ancestor` and no
participants. They exist to exercise search ranking and filtering, and staying
out of the hierarchy keeps the cohort counts above exact.
