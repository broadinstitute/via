#!/usr/bin/env python3
"""
Generate the synthetic fixture for the free-text -> condition concept_id ->
person_id lookup, per handoffs/HANDOFF_condition_lookup.md.

Three tables, because that is all the condition-domain pipeline touches:

    cb_criteria           text search + participant-count ranking
    concept_ancestor      descendant expansion
    condition_occurrence  person_id retrieval

Plus a fourth output, cb_criteria_string_count: the same rows with est_count
typed STRING instead of INT64, which is what SAFE_CAST is defending against.

Output is newline-delimited JSON (NDJSON) for `bq load`.

No real data. Every count here is invented, and every concept_id is allocated
in 9_000_000-9_099_999 so that no real OHDSI concept ID appears. That is
deliberate: the implementation hardcodes no concept IDs, so an accidental
hardcode picked up from this fixture fails loudly against the real CDR instead
of silently querying the wrong concept. Names are realistic, because name
matching is the thing under test.

Usage:
    python3 data/synthetic/generate_condition_lookup_synthetic.py \
        --out-dir data/synthetic \
        --schema-dir data
"""

import argparse
import json
import os
import random
import re
from datetime import date, timedelta

# ---------------------------------------------------------------------------
# Concepts (HANDOFF 6.2 / 6.3)
# ---------------------------------------------------------------------------
# est_count is an *estimate* in the real cb_criteria. 9000010's est_count of 47
# is intentionally short of the true expanded cohort of 49, so a sanity check
# tolerates small divergence while still catching gross error.

CONGENITAL_HEART_DISEASE = 9000001
TETRALOGY_OF_FALLOT = 9000010
TOF_PULMONARY_ATRESIA = 9000011
TOF_ABSENT_PULMONARY_VALVE = 9000012
PENTALOGY_OF_FALLOT = 9000013
TOF_LATE_SEQUELAE = 9000014
TOF_UNSPECIFIED = 9000015
TOF_IN_ADULT = 9000016
FALLOT_TETRALOGY_REPAIRED = 9000018
T2DM = 9000030
T2DM_RENAL = 9000031

# Fake type concept, so 6.1 holds for every concept_id in the fixture including
# the OMOP bookkeeping ones.
EHR_ENCOUNTER_DIAGNOSIS = 9000900

# concept_id, name, est_count, role
CONCEPTS = [
    (CONGENITAL_HEART_DISEASE,
     "Congenital heart disease", 310,
     "over-broad parent"),
    (TETRALOGY_OF_FALLOT,
     "Tetralogy of Fallot", 47,
     "primary target"),
    (TOF_PULMONARY_ATRESIA,
     "Tetralogy of Fallot with pulmonary atresia", 6,
     "child of 9000010"),
    (TOF_ABSENT_PULMONARY_VALVE,
     "Tetralogy of Fallot with absent pulmonary valve", 3,
     "child of 9000010"),
    (PENTALOGY_OF_FALLOT,
     "Pentalogy of Fallot", 11,
     "decoy: has 'fallot', lacks 'tetralogy'"),
    (TOF_LATE_SEQUELAE,
     "Tetralogy of Fallot, late sequelae", 0,
     "decoy: zero count"),
    (TOF_UNSPECIFIED,
     "Tetralogy of Fallot, unspecified", -1,
     "edge case: est_count = -1"),
    (TOF_IN_ADULT,
     "Tetralogy of Fallot in adult", None,
     "edge case: est_count = NULL, must sort last"),
    (FALLOT_TETRALOGY_REPAIRED,
     "Fallot tetralogy, repaired", 8,
     "stopword regression: inverted word order, no 'of' anywhere"),
    (T2DM,
     "Type 2 diabetes mellitus", 1200,
     "high-prevalence anchor"),
    (T2DM_RENAL,
     "Type 2 diabetes mellitus with renal complications", 180,
     "child of 9000030"),
]

# Pipe-delimited synonyms. full_text is the lowercased name plus these, which
# is why no concept_synonym table is needed to exercise synonym matching.
SYNONYMS = {
    TETRALOGY_OF_FALLOT: ["fallot tetralogy", "fallot's tetralogy", "tof"],
    T2DM: ["t2dm", "adult-onset diabetes"],
}

# Hierarchy path, one of the unused-but-present columns. Two different paths
# for 9000010 is how the real table reproduces duplicate rows per concept.
PATHS = {
    CONGENITAL_HEART_DISEASE: ["441840.4274025"],
    TETRALOGY_OF_FALLOT: ["441840.4274025.9000010",
                          "441840.4274025.9000019.9000010"],
    TOF_PULMONARY_ATRESIA: ["441840.4274025.9000010.9000011"],
    TOF_ABSENT_PULMONARY_VALVE: ["441840.4274025.9000010.9000012"],
    PENTALOGY_OF_FALLOT: ["441840.4274025.9000013"],
    TOF_LATE_SEQUELAE: ["441840.4274025.9000014"],
    TOF_UNSPECIFIED: ["441840.4274025.9000015"],
    TOF_IN_ADULT: ["441840.4274025.9000016"],
    FALLOT_TETRALOGY_REPAIRED: ["441840.4274025.9000018"],
    T2DM: ["441840.201826"],
    T2DM_RENAL: ["441840.201826.9000031"],
}

# ---------------------------------------------------------------------------
# Hierarchy (HANDOFF 6.4)
# ---------------------------------------------------------------------------
# ancestor -> [(descendant, levels)]. Self-rows at level 0 are added for every
# concept in build_concept_ancestor; code depends on that invariant, since
# seeding on a leaf must return the leaf.
#
# 9000013 descends from the shared parent but NOT from 9000010. That asymmetry
# is the point: it is what makes cohort([9000001]) differ from cohort([9000010]).
#
# 9000014/15/16/18 get self-rows only. They exist to exercise search ranking and
# filtering, and keeping them out of the hierarchy keeps the cohort counts exact.
ANCESTOR_EDGES = {
    CONGENITAL_HEART_DISEASE: [
        (TETRALOGY_OF_FALLOT, 1),
        (TOF_PULMONARY_ATRESIA, 2),
        (TOF_ABSENT_PULMONARY_VALVE, 2),
        (PENTALOGY_OF_FALLOT, 1),
    ],
    TETRALOGY_OF_FALLOT: [
        (TOF_PULMONARY_ATRESIA, 1),
        (TOF_ABSENT_PULMONARY_VALVE, 1),
    ],
    T2DM: [
        (T2DM_RENAL, 1),
    ],
}

# ---------------------------------------------------------------------------
# Participants (HANDOFF 6.5)
# ---------------------------------------------------------------------------
# Disjoint contiguous assignment so the expected counts are exact, not sampled.
PERSON_RANGES = {
    TETRALOGY_OF_FALLOT: range(1, 41),        # 40
    TOF_PULMONARY_ATRESIA: range(41, 47),     # 6
    TOF_ABSENT_PULMONARY_VALVE: range(47, 50),  # 3
    PENTALOGY_OF_FALLOT: range(200, 211),     # 11
}

T2DM_POOL = range(1000, 5001)   # disjoint from the ranges above
T2DM_N = 1200
T2DM_RENAL_N = 180              # subset of the T2DM persons

FIRST_DATE = date(2015, 1, 1)
LAST_DATE = date(2024, 12, 31)

# Terms dropped before matching. Requiring the literal token "of" would exclude
# the inverted synonym "Fallot tetralogy", which is exactly the word-order case
# token matching exists to catch. Kept in sync with the notebook.
STOP = {"of", "the", "and", "or", "with", "in", "to", "for", "by", "on", "at", "as"}


def full_text(concept_id, name):
    """Lowercased name plus pipe-delimited synonyms, as the real column is built."""
    parts = [name.lower()] + SYNONYMS.get(concept_id, [])
    return " | ".join(parts)


def build_cb_criteria():
    """
    One row per (concept, path), plus the edge-case rows from HANDOFF 6.3.

    The search projects DISTINCT concept_id/name/est_count, so the duplicate
    rows for 9000010 collapse only because id and path are excluded from the
    SELECT. Every duplicate pair below is therefore identical in all three
    projected columns; making them differ would silently reintroduce the
    duplicate the fixture is meant to catch.
    """
    rows = []
    next_id = 1

    for concept_id, name, est_count, _role in CONCEPTS:
        is_leaf = concept_id not in ANCESTOR_EDGES
        for path in PATHS[concept_id]:
            rows.append({
                "id": next_id,
                "parent_id": int(path.split(".")[-2]) if "." in path else None,
                "domain_id": "CONDITION",   # UPPERCASE here, mixed case in `concept`
                "is_standard": 1,
                "type": "SNOMED",
                "subtype": None,
                "concept_id": concept_id,
                "code": f"{concept_id % 1000000}00{concept_id % 7}",
                "name": name,
                "value": None,
                "est_count": est_count,
                "is_group": 0 if is_leaf else 1,
                "is_selectable": 1,
                "has_hierarchy": 1,
                "has_ancestor_data": 0,
                "path": path,
                "synonyms": " | ".join(SYNONYMS.get(concept_id, [])) or None,
                "item_count": est_count,
                "rollup_count": est_count,
                "full_text": full_text(concept_id, name),
            })
            next_id += 1

    # Group/header row: no concept_id. Its full_text deliberately matches the
    # fallot searches, so the `concept_id IS NOT NULL` filter is the only thing
    # keeping it out of the results.
    rows.append({
        "id": next_id,
        "parent_id": None,
        "domain_id": "CONDITION",
        "is_standard": 1,
        "type": "SNOMED",
        "subtype": None,
        "concept_id": None,
        "code": None,
        "name": "Fallot tetralogy and related anomalies",
        "value": None,
        "est_count": None,
        "is_group": 1,
        "is_selectable": 0,
        "has_hierarchy": 1,
        "has_ancestor_data": 0,
        "path": "441840.4274025.9000019",
        "synonyms": None,
        "item_count": None,
        "rollup_count": None,
        "full_text": "fallot tetralogy and related anomalies",
    })

    rows.sort(key=lambda r: r["id"])
    return rows


def to_string_count(rows):
    """
    The est_count-as-STRING variant.

    9000016 becomes the non-numeric case: SAFE_CAST("unknown" AS INT64) is NULL,
    which is the same value the INT64 table already has for that concept. Both
    tables should therefore produce identical query results, and that
    equivalence is the assertion.
    """
    out = []
    for r in rows:
        r = dict(r)
        if r["concept_id"] == TOF_IN_ADULT:
            r["est_count"] = "unknown"
        else:
            r["est_count"] = None if r["est_count"] is None else str(r["est_count"])
        out.append(r)
    return out


def build_concept_ancestor():
    """Self-rows at level 0 for every concept, plus the declared edges."""
    rows = []
    for concept_id, _name, _count, _role in CONCEPTS:
        rows.append({
            "ancestor_concept_id": concept_id,
            "descendant_concept_id": concept_id,
            "min_levels_of_separation": 0,
            "max_levels_of_separation": 0,
        })
    for ancestor, edges in ANCESTOR_EDGES.items():
        for descendant, levels in edges:
            rows.append({
                "ancestor_concept_id": ancestor,
                "descendant_concept_id": descendant,
                "min_levels_of_separation": levels,
                "max_levels_of_separation": levels,
            })
    rows.sort(key=lambda r: (r["ancestor_concept_id"], r["descendant_concept_id"]))
    return rows


def assign_persons(rng):
    """concept_id -> sorted list of person_ids. Deterministic given the seed."""
    assignment = {c: sorted(r) for c, r in PERSON_RANGES.items()}
    t2dm = sorted(rng.sample(list(T2DM_POOL), T2DM_N))
    assignment[T2DM] = t2dm
    assignment[T2DM_RENAL] = sorted(rng.sample(t2dm, T2DM_RENAL_N))
    return assignment


def build_condition_occurrence(rng, assignment):
    """
    1-5 occurrence rows per (person, concept), with varied dates, so that
    DISTINCT person_id is doing real work rather than passing by accident.
    """
    span = (LAST_DATE - FIRST_DATE).days
    rows = []
    next_id = 1

    for concept_id in sorted(assignment):
        for person_id in assignment[concept_id]:
            for _ in range(rng.randint(1, 5)):
                start = FIRST_DATE + timedelta(days=rng.randint(0, span))
                has_end = rng.random() < 0.7
                end = start + timedelta(days=rng.randint(0, 30)) if has_end else None
                hour, minute = rng.randint(7, 19), rng.choice([0, 15, 30, 45])
                rows.append({
                    "condition_occurrence_id": next_id,
                    "person_id": person_id,
                    "condition_concept_id": concept_id,
                    "condition_start_date": start.isoformat(),
                    "condition_start_datetime":
                        f"{start.isoformat()} {hour:02d}:{minute:02d}:00 UTC",
                    "condition_end_date": end.isoformat() if end else None,
                    "condition_end_datetime":
                        f"{end.isoformat()} {hour:02d}:{minute:02d}:00 UTC"
                        if end else None,
                    "condition_type_concept_id": EHR_ENCOUNTER_DIAGNOSIS,
                    "condition_status_concept_id": None,
                    "stop_reason": None,
                    "provider_id": None,
                    "visit_occurrence_id": rng.randint(1, 500000),
                    "visit_detail_id": None,
                    "condition_source_value": f"SYN{concept_id % 100000}",
                    "condition_source_concept_id": concept_id,
                    "condition_status_source_value": None,
                })
                next_id += 1

    rows.sort(key=lambda r: (r["person_id"], r["condition_start_date"],
                             r["condition_occurrence_id"]))
    return rows


# ---------------------------------------------------------------------------
# Self-check (HANDOFF 6.6)
# ---------------------------------------------------------------------------
# These recompute the expected results from the generated rows. They are not a
# substitute for running the real queries against BigQuery; they only catch the
# fixture drifting out from under the assertions, which is the failure mode that
# turns 6.6 into flakes.

def _query_terms(text, strip_stopwords=True):
    """Mirrors the notebook's _terms()."""
    toks = [t.strip(",.;:()") for t in text.lower().split()]
    toks = [t for t in toks if t and len(t) > 1]
    if not strip_stopwords:
        return toks
    return [t for t in toks if t not in STOP] or toks


def _search(rows, text, use_search, strip_stopwords=True):
    """
    Approximates the two matching branches well enough to check the fixture:
    SEARCH() matches whole tokens, LIKE '%term%' matches substrings.
    Both require every term. Real BigQuery tokenization is richer than this.
    """
    terms = _query_terms(text, strip_stopwords)
    hits = []
    for r in rows:
        if r["is_standard"] != 1 or r["concept_id"] is None:
            continue
        if r["domain_id"] != "CONDITION":
            continue
        ft = r["full_text"].lower()
        if use_search:
            tokens = set(re.split(r"[^a-z0-9]+", ft))
            ok = all(t in tokens for t in terms)
        else:
            ok = all(t in ft for t in terms)
        if ok:
            hits.append((r["concept_id"], r["name"], r["est_count"]))

    distinct = sorted(set(hits))
    exact = text.lower().strip()
    return sorted(
        distinct,
        key=lambda h: (h[1].lower().strip() == exact,
                       h[2] if h[2] is not None else float("-inf")),
        reverse=True,
    )


def _cohort(ancestor_rows, occurrence_rows, seeds):
    descendants = {r["descendant_concept_id"] for r in ancestor_rows
                   if r["ancestor_concept_id"] in seeds}
    return {r["person_id"] for r in occurrence_rows
            if r["condition_concept_id"] in descendants}


def verify(cb_rows, cb_string_rows, ancestor_rows, occurrence_rows):
    failures = []

    def check(label, actual, expected):
        if actual != expected:
            failures.append(f"{label}: expected {expected}, got {actual}")

    for use_search in (True, False):
        branch = "SEARCH()" if use_search else "LIKE"
        hits = _search(cb_rows, "tetralogy of fallot", use_search)
        ids = [h[0] for h in hits]

        check(f"[{branch}] top hit for 'tetralogy of fallot'",
              ids[0] if ids else None, TETRALOGY_OF_FALLOT)
        check(f"[{branch}] 9000010 appears once despite two cb_criteria rows",
              ids.count(TETRALOGY_OF_FALLOT), 1)
        for expected_id in (TOF_PULMONARY_ATRESIA, TOF_ABSENT_PULMONARY_VALVE,
                            TOF_LATE_SEQUELAE):
            check(f"[{branch}] 'tetralogy of fallot' includes {expected_id}",
                  expected_id in ids, True)
        check(f"[{branch}] 'tetralogy of fallot' excludes Pentalogy",
              PENTALOGY_OF_FALLOT in ids, False)
        check(f"[{branch}] 'tetralogy of fallot' excludes the concept_id=NULL "
              f"group row", None in ids, False)

        # Stopword regression. 9000018 "Fallot tetralogy, repaired" contains no
        # "of" in any form, so requiring the literal token drops it. If this
        # check ever passes with stopwords left in, the fixture has lost its
        # ability to detect the bug 5 warns about.
        check(f"[{branch}] stopwords stripped finds 9000018",
              FALLOT_TETRALOGY_REPAIRED in ids, True)
        kept = [h[0] for h in _search(cb_rows, "tetralogy of fallot", use_search,
                                      strip_stopwords=False)]
        check(f"[{branch}] requiring 'of' loses 9000018 (regression is live)",
              FALLOT_TETRALOGY_REPAIRED in kept, False)

        inverted = [h[0] for h in _search(cb_rows, "fallot tetralogy", use_search)]
        check(f"[{branch}] 'fallot tetralogy' tops out at 9000010",
              inverted[0] if inverted else None, TETRALOGY_OF_FALLOT)

        tof = [h[0] for h in _search(cb_rows, "TOF", use_search)]
        check(f"[{branch}] 'TOF' matches 9000010 via synonym",
              tof, [TETRALOGY_OF_FALLOT])

    # The one place the branches must differ (6.6).
    check("[LIKE] 'diabet' matches 9000030",
          T2DM in [h[0] for h in _search(cb_rows, "diabet", False)], True)
    check("[SEARCH()] 'diabet' matches nothing",
          _search(cb_rows, "diabet", True), [])

    # The INT64 and STRING est_count tables must be indistinguishable after
    # SAFE_CAST, which is the whole claim the variant fixture is making.
    def safe_cast(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return None
    check("string-typed est_count survives SAFE_CAST identically",
          [safe_cast(r["est_count"]) for r in cb_string_rows],
          [r["est_count"] for r in cb_rows])

    check("cohort([9000010])",
          len(_cohort(ancestor_rows, occurrence_rows, {TETRALOGY_OF_FALLOT})), 49)
    check("cohort([9000001]) pulls in Pentalogy",
          len(_cohort(ancestor_rows, occurrence_rows, {CONGENITAL_HEART_DISEASE})), 60)
    check("cohort([9000030]) anchor",
          len(_cohort(ancestor_rows, occurrence_rows, {T2DM})), 1200)
    check("cohort([9000031])",
          len(_cohort(ancestor_rows, occurrence_rows, {T2DM_RENAL})), 180)

    # Every concept is its own ancestor at level 0. Seeding on a leaf must
    # return that leaf.
    selfrows = {r["ancestor_concept_id"] for r in ancestor_rows
                if r["ancestor_concept_id"] == r["descendant_concept_id"]
                and r["min_levels_of_separation"] == 0}
    check("every concept is its own ancestor at level 0",
          selfrows, {c[0] for c in CONCEPTS})

    # min_participants=1 must drop the zero/negative/NULL decoys.
    ranked = _search(cb_rows, "tetralogy of fallot", False)
    eligible = [h[0] for h in ranked if (h[2] or 0) >= 1]
    for dropped in (TOF_LATE_SEQUELAE, TOF_UNSPECIFIED, TOF_IN_ADULT):
        check(f"min_participants=1 drops {dropped}", dropped in eligible, False)

    return failures


def write_ndjson(path, rows, schema_path=None):
    if schema_path:
        with open(schema_path) as fh:
            schema = json.load(fh)
        expected = {f["name"] for f in schema}
        produced = set(rows[0].keys())
        missing, extra = expected - produced, produced - expected
        if missing:
            raise SystemExit(f"ERROR: {path}: schema fields not generated: {sorted(missing)}")
        if extra:
            raise SystemExit(f"ERROR: {path}: generated fields not in schema: {sorted(extra)}")
        order = [f["name"] for f in schema]
        rows = [{k: r[k] for k in order} for r in rows]

    with open(path, "w") as fh:
        for r in rows:
            fh.write(json.dumps(r) + "\n")
    print(f"Wrote {len(rows):>5} rows to {path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", default="data/synthetic")
    ap.add_argument("--schema-dir", default="data",
                    help="Directory of BQ schema JSONs, for field validation.")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--skip-verify", action="store_true",
                    help="Write the files even if the 6.6 self-check fails.")
    args = ap.parse_args()

    rng = random.Random(args.seed)

    cb_rows = build_cb_criteria()
    cb_string_rows = to_string_count(cb_rows)
    ancestor_rows = build_concept_ancestor()
    occurrence_rows = build_condition_occurrence(rng, assign_persons(rng))

    failures = verify(cb_rows, cb_string_rows, ancestor_rows, occurrence_rows)
    if failures:
        for f in failures:
            print(f"FAIL  {f}")
        if not args.skip_verify:
            raise SystemExit(f"\n{len(failures)} fixture self-check failure(s); "
                             f"nothing written.")
    else:
        print("Fixture self-check passed (HANDOFF 6.6).")

    outputs = [
        ("synthetic_cb_criteria.ndjson", cb_rows, "cb_criteria_schema.json"),
        ("synthetic_cb_criteria_string_count.ndjson", cb_string_rows,
         "cb_criteria_string_count_schema.json"),
        ("synthetic_concept_ancestor.ndjson", ancestor_rows,
         "concept_ancestor_schema.json"),
        ("synthetic_condition_occurrence.ndjson", occurrence_rows,
         "condition_occurrence_schema.json"),
    ]
    for filename, rows, schema_name in outputs:
        write_ndjson(
            os.path.join(args.out_dir, filename),
            rows,
            os.path.join(args.schema_dir, schema_name) if args.schema_dir else None,
        )


if __name__ == "__main__":
    main()
