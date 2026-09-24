# data

Synthetic data for prototyping against the All of Us tables VIA queries, so local
development and testing don't need access to a real CDR.

## Layout

```
data/synthetic/
  generators/   the scripts that produce the tables below
  schemas/      BigQuery table schemas (field name, type, mode)
  tables/       generated NDJSON, one JSON object per line, ready for `bq load`
```

There are currently two synthetic datasets, with generators for each:

## Variant Annotation Table (VAT)

| | |
|---|---|
| Schema | `schemas/foxtrot_v4_2025_07_29_vat_v9_r2_p2_schema.json` |
| Table | `tables/synthetic_foxtrot_vat.ndjson` (1,000 rows) |
| Generator | `generators/generate_vat_synthetic.py` |

114 fields covering variant identity, GVS allele counts and frequencies (overall and
per-subpopulation), gnomAD frequencies, transcript/consequence annotations, ClinVar, OMIM,
and in-silico predictors (REVEL, SpliceAI, GERP, LoF).

```
python3 data/synthetic/generators/generate_vat_synthetic.py
```

Deterministic given `--seed` (default 42). `--rows` changes the row count, and `--schema ""`
skips field validation.

## Condition lookup

Three tables backing free-text → condition `concept_id` → `person_id`.

| Schema | Table | Rows |
|---|---|---|
| `schemas/cb_criteria_schema.json` | `tables/synthetic_cb_criteria.ndjson` | 13 |
| `schemas/concept_ancestor_schema.json` | `tables/synthetic_concept_ancestor.ndjson` | 18 |
| `schemas/condition_occurrence_schema.json` | `tables/synthetic_condition_occurrence.ndjson` | 4,409 |

`cb_criteria` is the All of Us cohort-builder table the text search runs against;
`concept_ancestor` expands a concept to its descendants; `condition_occurrence` is standard
OMOP and is where the participants come from.

```
python3 data/synthetic/generators/generate_condition_lookup_tables_synthetic.py
```

Deterministic given `--seed` (default 42).

### What the fixture is built around

`cb_criteria` shape:

- **9000010 appears twice** at different `path` values, identical in every other column a
  search projects. Dedup works only because `id` and `path` are excluded from the `SELECT`;
  adding either back reintroduces the duplicate.
- **One group row with `concept_id = NULL`**, whose `full_text` deliberately matches the
  fallot searches. The `concept_id IS NOT NULL` filter is the only thing keeping it out.
- **`est_count` of `-1` (9000015) and `NULL` (9000016)** sit on their own concepts rather
  than on concepts that already have a normal row — otherwise `SELECT DISTINCT` wouldn't
  collapse them and they'd break the appears-once case above.
- **9000018 "Fallot tetralogy, repaired"** contains no `of` in any form. Requiring the
  literal token `of` drops it, which is the inverted-word-order case that dropping
  connectives before matching exists to catch.

Cohort counts, exact by construction and verified against BigQuery:

| Seed | Participants | Why |
|---|---|---|
| `[9000010]` | 49 | 40 + 6 + 3 via descendant expansion; seed-only matching gives 40 |
| `[9000001]` | 60 | also pulls in Pentalogy — the "don't seed on a parent" failure, made visible |
| `[9000030]` | 1,200 | high-prevalence anchor |
| `[9000031]` | 180 | subset of the above |

9000010's `est_count` is **47** against a true cohort of **49**. That mismatch is
intentional: `est_count` is an estimate in the real table, so a sanity check should tolerate
small divergence while still catching gross error.

9000014, 9000015, 9000016 and 9000018 have self-rows in `concept_ancestor` and no
participants. They exist to exercise search ranking and filtering, and staying out of the
hierarchy keeps the cohort counts above exact.
