"""
Familial hypercholesterolemia: LDLR, APOB and PCSK9.

The story: expert-panel LDLR missense variants, an LDLR nonsense variant and APOB's familial
defective apoB variant (p.Arg3527Gln) are enriched in the matched cohort. PCSK9 p.Arg46Leu runs
the other way: a common loss-of-function variant that lowers LDL, so it's depleted among people
with FH, as are two PCSK9 nonsense variants common in African ancestry. A benign LDLR variant and
a conflicting APOB variant sit near background. One LDLR VUS is enriched; another isn't in All of
Us.

Variants checked against ClinVar (esummary) and Ensembl VEP (MANE Select), 2026-09-28.
"""

from .common import ClinVar, Condition, Matched, UseCase, Variant

EXPERT_PANEL_FH = dict(
    classification="Pathogenic", review_status="reviewed by expert panel",
    conditions=("Hypercholesterolemia, familial, 1",),
)

CASE = UseCase(
    key="familial_hypercholesterolemia",
    title="Familial hypercholesterolemia",
    description="LDLR, APOB and PCSK9, including a protective PCSK9 variant depleted in affected participants.",
    condition=Condition(
        concept_id=9000050, name="Familial hypercholesterolemia", est_count=386, participants=391,
        synonyms=("fh", "familial hypercholesterolaemia", "heterozygous familial hypercholesterolemia"),
    ),
    ancestry={"EUR": 204, "AFR": 74, "AMR": 62, "OTH": 26, "EAS": 12, "SAS": 9, "MID": 4},
    age={"18–29": 14, "30–39": 38, "40–49": 72, "50–59": 104, "60–69": 98, "70+": 65},
    variants=(
        Variant(
            vid="19-11116928-G-A", gene="LDLR", gene_id="ENSG00000130164",
            transcript="ENST00000558518", mane="NM_000527.5", hgvsc="c.1775G>A", hgvsp="p.Gly592Glu",
            consequence=("missense_variant",), exon="12/18", rsid="rs137929307",
            clinvar=ClinVar(last_evaluated="2021-06-09",
                            rcvs=("RCV000172964", "RCV000162001", "RCV000587007", "RCV000844730", "RCV002051664",
                                  "RCV002399517"), **EXPERT_PANEL_FH),
            aou={"eur": 9, "oth": 1}, gnomad={"nfe": 3}, revel=0.97, matched=Matched(carriers_ac=5),
        ),
        Variant(
            vid="19-11105568-A-G", gene="LDLR", gene_id="ENSG00000130164",
            transcript="ENST00000558518", mane="NM_000527.5", hgvsc="c.662A>G", hgvsp="p.Asp221Gly",
            consequence=("missense_variant",), exon="4/18", rsid="rs373822756",
            clinvar=ClinVar(last_evaluated="2022-05-30",
                            rcvs=("RCV000161962", "RCV000211655", "RCV000844743", "RCV000771313", "RCV002362854",
                                  "RCV006649931"), **EXPERT_PANEL_FH),
            aou={"eur": 4, "amr": 1}, gnomad={"nfe": 2}, revel=0.95, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="19-11120425-C-A", gene="LDLR", gene_id="ENSG00000130164",
            transcript="ENST00000558518", mane="NM_000527.5", hgvsc="c.2043C>A", hgvsp="p.Cys681Ter",
            consequence=("stop_gained",), exon="14/18", rsid="rs121908031",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-03-26",
                rcvs=("RCV000003887", "RCV000481771", "RCV000590806", "RCV000844750", "RCV002415394", "RCV004584310"),
                conditions=("Hypercholesterolemia, familial, 1", "Homozygous familial hypercholesterolemia"),
            ),
            aou={"eur": 3}, gnomad=None, lof="HC", matched=Matched(carriers_ac=3),
        ),
        Variant(
            vid="19-11105528-G-A", gene="LDLR", gene_id="ENSG00000130164",
            transcript="ENST00000558518", mane="NM_000527.5", hgvsc="c.622G>A", hgvsp="p.Glu208Lys",
            consequence=("missense_variant",), exon="4/18", rsid="rs879254597",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2025-12-05",
                rcvs=("RCV000238110", "RCV000775045", "RCV001729479", "RCV002365238", "RCV004017545", "RCV003409368"),
                conditions=("Familial hypercholesterolemia", "Homozygous familial hypercholesterolemia"),
            ),
            aou={"amr": 2, "eur": 1}, gnomad={"amr": 1}, revel=0.93, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="2-21006288-C-T", gene="APOB", gene_id="ENSG00000084674",
            transcript="ENST00000233242", mane="NM_000384.3", hgvsc="c.10580G>A", hgvsp="p.Arg3527Gln",
            consequence=("missense_variant",), exon="26/29", rsid="rs5742904",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-08-06",
                rcvs=("RCV000019479", "RCV000254882", "RCV000412515", "RCV000499833", "RCV000851289", "RCV000771116"),
                conditions=("Familial hypercholesterolemia", "Homozygous familial hypercholesterolemia"),
            ),
            # Familial defective apoB: about 1 in 1,000 people of European ancestry.
            aou={"eur": 0.00048, "oth": 0.0002, "amr": 0.00008}, gnomad={"nfe": 0.00043, "oth": 0.0002, "amr": 0.0001},
            revel=0.64, matched=Matched(carriers_ac=4),
        ),
        Variant(
            vid="1-55039974-G-T", gene="PCSK9", gene_id="ENSG00000169174",
            transcript="ENST00000302118", mane="NM_174936.4", hgvsc="c.137G>T", hgvsp="p.Arg46Leu",
            consequence=("missense_variant",), exon="1/12", rsid="rs11591147",
            clinvar=ClinVar(
                classification="Benign/Likely benign",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-02-03",
                rcvs=("RCV000003012", "RCV000203182", "RCV000256313", "RCV000508774", "RCV000605465", "RCV000985896"),
                conditions=("Familial hypercholesterolemia", "Hypobetalipoproteinemia"),
            ),
            aou={"eur": 0.017, "afr": 0.0021, "amr": 0.0068, "oth": 0.011, "sas": 0.0035, "mid": 0.009},
            gnomad={"nfe": 0.016, "afr": 0.002, "amr": 0.006, "asj": 0.012, "fin": 0.018, "sas": 0.004, "oth": 0.011},
            # Protective, so rarer among the affected than in the cohort as a whole.
            revel=0.36, matched=Matched(carriers_ac=3),
        ),
        Variant(
            vid="19-11123297-C-A", gene="LDLR", gene_id="ENSG00000130164",
            transcript="ENST00000558518", mane="NM_000527.5", hgvsc="c.2264C>A", hgvsp="p.Ala755Asp",
            consequence=("missense_variant",), exon="15/18", rsid=None,
            clinvar=ClinVar(
                classification="Uncertain significance", review_status="criteria provided, single submitter",
                last_evaluated="2019-12-17", rcvs=("RCV006886674",), conditions=(),
            ),
            aou={"afr": 3}, gnomad={"afr": 1}, revel=0.58, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="19-11120436-C-T", gene="LDLR", gene_id="ENSG00000130164",
            transcript="ENST00000558518", mane="NM_000527.5", hgvsc="c.2054C>T", hgvsp="p.Pro685Leu",
            consequence=("missense_variant",), exon="14/18", rsid="rs28942084",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-07-20",
                rcvs=("RCV000003891", "RCV000162007", "RCV000775085", "RCV000844731", "RCV002415395", "RCV004745144"),
                conditions=("Familial hypercholesterolemia", "Homozygous familial hypercholesterolemia"),
            ),
            aou={"eur": 5, "oth": 1}, gnomad={"nfe": 2},
            revel=0.96, matched=Matched(carriers_ac=3),
        ),
        Variant(
            vid="19-11113337-C-T", gene="LDLR", gene_id="ENSG00000130164",
            transcript="ENST00000558518", mane="NM_000527.5", hgvsc="c.1246C>T", hgvsp="p.Arg416Trp",
            consequence=("missense_variant",), exon="9/18", rsid="rs570942190",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2025-12-18",
                rcvs=("RCV000161982", "RCV000211633", "RCV000586690", "RCV000825619", "RCV002390392", "RCV005404299"),
                conditions=("Familial hypercholesterolemia", "Homozygous familial hypercholesterolemia"),
            ),
            aou={"eur": 2, "afr": 1}, gnomad={"nfe": 1},
            revel=0.94, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="19-11113743-G-A", gene="LDLR", gene_id="ENSG00000130164",
            transcript="ENST00000558518", mane="NM_000527.5", hgvsc="c.1567G>A", hgvsp="p.Val523Met",
            consequence=("missense_variant",), exon="10/18", rsid="rs28942080",
            clinvar=ClinVar(
                classification="Pathogenic",
                review_status="reviewed by expert panel", last_evaluated="2023-01-27",
                rcvs=("RCV000003884", "RCV000161992", "RCV000587718", "RCV000825622", "RCV002399309", "RCV006893654"),
                conditions=("Hypercholesterolemia, familial, 1",),
            ),
            aou={"eur": 2}, gnomad=None,
            revel=0.95, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="19-11102774-G-A", gene="LDLR", gene_id="ENSG00000130164",
            transcript="ENST00000558518", mane="NM_000527.5", hgvsc="c.301G>A", hgvsp="p.Glu101Lys",
            consequence=("missense_variant",), exon="3/18", rsid="rs144172724",
            clinvar=ClinVar(
                classification="Pathogenic",
                review_status="reviewed by expert panel", last_evaluated="2021-12-13",
                rcvs=("RCV000162016", "RCV000211583", "RCV000775032", "RCV000844744", "RCV002051659", "RCV002433637"),
                conditions=("Hypercholesterolemia, familial, 1",),
            ),
            aou={"eur": 3, "amr": 1}, gnomad={"nfe": 1},
            revel=0.9, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="19-11123210-C-T", gene="LDLR", gene_id="ENSG00000130164",
            transcript="ENST00000558518", mane="NM_000527.5", hgvsc="c.2177C>T", hgvsp="p.Thr726Ile",
            consequence=("missense_variant",), exon="15/18", rsid="rs45508991",
            clinvar=ClinVar(
                classification="Benign",
                review_status="reviewed by expert panel", last_evaluated="2022-05-24",
                rcvs=("RCV000030134", "RCV000162011", "RCV000247593", "RCV000771082", "RCV002426526"),
                conditions=("Hypercholesterolemia, familial, 1",),
            ),
            # Benign, and close to background in the matched cohort.
            aou={"eur": 0.0024, "afr": 0.0003, "amr": 0.0009, "oth": 0.0015}, gnomad={"nfe": 0.0022, "afr": 0.0003, "amr": 0.001, "fin": 0.004, "oth": 0.0012},
            revel=0.15, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="1-55046549-C-G", gene="PCSK9", gene_id="ENSG00000169174",
            transcript="ENST00000302118", mane="NM_174936.4", hgvsc="c.426C>G", hgvsp="p.Tyr142Ter",
            consequence=("stop_gained",), exon="3/12", rsid="rs67608943",
            clinvar=ClinVar(
                classification="Conflicting classifications of pathogenicity",
                review_status="criteria provided, conflicting classifications", last_evaluated="2026-08-01",
                rcvs=("RCV000003010", "RCV000588335", "RCV001191121", "RCV001097394", "RCV001731276", "RCV004658956"),
                rcv_classifications=("Likely benign", "Pathogenic", "Uncertain significance", "Benign", "Uncertain significance", "Likely benign"),
                conditions=("Hypercholesterolemia, autosomal dominant, 3", "Familial hypercholesterolemia"),
            ),
            # Loss of function lowers LDL, so like p.Arg46Leu it's protective: absent from the matched cohort.
            aou={"afr": 0.0045, "amr": 0.0003, "oth": 0.0008}, gnomad={"afr": 0.004, "amr": 0.0002},
            lof="HC", matched=Matched(carriers_ac=0),
        ),
        Variant(
            vid="1-55063542-C-A", gene="PCSK9", gene_id="ENSG00000169174",
            transcript="ENST00000302118", mane="NM_174936.4", hgvsc="c.2037C>A", hgvsp="p.Cys679Ter",
            consequence=("stop_gained",), exon="12/12", rsid="rs28362286",
            clinvar=ClinVar(
                classification="Conflicting classifications of pathogenicity",
                review_status="criteria provided, conflicting classifications", last_evaluated="2026-06-15",
                rcvs=("RCV000003011", "RCV000508694", "RCV000531428", "RCV000771132", "RCV001731277", "RCV001508868"),
                rcv_classifications=("Likely benign", "Pathogenic", "Benign", "Uncertain significance", "Uncertain significance", "Likely benign"),
                conditions=("Hypercholesterolemia, autosomal dominant, 3", "Familial hypercholesterolemia"),
            ),
            # Another protective loss-of-function variant, common in African ancestry: depleted among the matched.
            aou={"afr": 0.0098, "amr": 0.0006, "oth": 0.0017, "eur": 0.00004}, gnomad={"afr": 0.009, "amr": 0.0005, "oth": 0.001},
            lof="HC", matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="2-21006196-G-A", gene="APOB", gene_id="ENSG00000084674",
            transcript="ENST00000233242", mane="NM_000384.3", hgvsc="c.10672C>T", hgvsp="p.Arg3558Cys",
            consequence=("missense_variant",), exon="26/29", rsid="rs12713559",
            clinvar=ClinVar(
                classification="Conflicting classifications of pathogenicity",
                review_status="criteria provided, conflicting classifications", last_evaluated="2026-08-21",
                rcvs=("RCV000019486", "RCV000219069", "RCV000412657", "RCV000587550", "RCV001837440", "RCV002408470"),
                rcv_classifications=("Uncertain significance", "Likely pathogenic", "Uncertain significance", "Likely benign", "Uncertain significance", "Benign"),
                conditions=("Hypercholesterolemia, autosomal dominant, type B", "Familial hypercholesterolemia"),
            ),
            aou={"eur": 0.0011, "afr": 0.0002, "amr": 0.0005, "oth": 0.0008}, gnomad={"nfe": 0.001, "afr": 0.0002, "amr": 0.0004, "fin": 0.0009, "oth": 0.0007},
            revel=0.42, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="19-11116132-T-A", gene="LDLR", gene_id="ENSG00000130164",
            transcript="ENST00000558518", mane="NM_000527.5", hgvsc="c.1625T>A", hgvsp="p.Ile542Asn",
            consequence=("missense_variant",), exon="11/18", rsid=None,
            clinvar=ClinVar(
                classification="Uncertain significance", review_status="criteria provided, single submitter",
                last_evaluated="2022-10-14", rcvs=("RCV006886669",), conditions=(),
            ),
            aou=None, gnomad=None,
        ),
    ),
)
