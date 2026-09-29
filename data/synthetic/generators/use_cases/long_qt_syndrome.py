"""
Long QT syndrome: cardiac ion channel genes (KCNQ1, KCNH2, SCN5A, KCNE1).

The story: pathogenic channel variants are enriched in the matched cohort, including KCNQ1
p.Gly589Asp, a Finnish founder variant that gnomAD sees mostly in its Finnish population. SCN5A
p.His558Arg and KCNH2 p.Lys897Thr are so common that they sit right at background, as does
SCN5A p.Ser1102Tyr, common in African ancestry. KCNE1
p.Asp85Asn, a conflicting "risk factor" variant, comes out modestly enriched. One KCNH2 VUS is in
nobody matched; another isn't in All of Us.

Variants checked against ClinVar (esummary) and Ensembl VEP (MANE Select), 2026-09-28. SCN5A's
p.Glu1783Lys, p.Arg1622Gln and p.Ser1102Tyr are the legacy "E1784K", "R1623Q" and "S1103Y",
renumbered on the MANE transcript.
"""

from .common import ClinVar, Condition, Matched, UseCase, Variant

CASE = UseCase(
    key="long_qt_syndrome",
    title="Long QT syndrome",
    description="Cardiac ion channel genes, with a Finnish founder variant and a very common benign SCN5A variant.",
    condition=Condition(
        concept_id=9000060, name="Long QT syndrome", est_count=128, participants=131,
        synonyms=("lqts", "romano-ward syndrome", "congenital long qt syndrome"),
    ),
    ancestry={"EUR": 68, "AFR": 27, "AMR": 20, "OTH": 9, "EAS": 4, "SAS": 2, "MID": 1},
    # Often diagnosed young, after a fainting episode or an ECG.
    age={"18–29": 26, "30–39": 29, "40–49": 27, "50–59": 23, "60–69": 17, "70+": 9},
    variants=(
        Variant(
            vid="11-2583535-C-T", gene="KCNQ1", gene_id="ENSG00000053918",
            transcript="ENST00000155840", mane="NM_000218.3", hgvsc="c.1022C>T", hgvsp="p.Ala341Val",
            consequence=("missense_variant",), exon="7/16", rsid="rs12720459",
            clinvar=ClinVar(
                classification="Pathogenic", review_status="criteria provided, multiple submitters, no conflicts",
                last_evaluated="2025-11-05",
                rcvs=("RCV000003269", "RCV000057528", "RCV000171124", "RCV000619686", "RCV006547484"),
                conditions=("Long QT syndrome 1", "Cardiac arrhythmia"),
            ),
            aou={"eur": 2, "afr": 1}, gnomad=None, revel=0.95, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="11-2778009-G-A", gene="KCNQ1", gene_id="ENSG00000053918",
            transcript="ENST00000155840", mane="NM_000218.3", hgvsc="c.1766G>A", hgvsp="p.Gly589Asp",
            consequence=("missense_variant",), exon="15/16", rsid="rs120074190",
            clinvar=ClinVar(
                classification="Pathogenic", review_status="reviewed by expert panel", last_evaluated="2025-07-01",
                rcvs=("RCV000003288", "RCV000003289", "RCV000057633", "RCV000182223", "RCV000622145", "RCV000699476"),
                conditions=("Long QT syndrome 1",),
            ),
            # KCNQ1-Fin: gnomAD's max population is Finnish; All of Us, with no Finnish group, has
            # it under European.
            aou={"eur": 2}, gnomad={"fin": 4}, revel=0.93, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="11-2570719-G-A", gene="KCNQ1", gene_id="ENSG00000053918",
            transcript="ENST00000155840", mane="NM_000218.3", hgvsc="c.569G>A", hgvsp="p.Arg190Gln",
            consequence=("missense_variant",), exon="3/16", rsid="rs120074178",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2025-12-31",
                rcvs=("RCV000003264", "RCV000046088", "RCV000057706", "RCV000182086", "RCV000588393", "RCV001841223"),
                conditions=("Long QT syndrome", "Congenital long QT syndrome"),
            ),
            aou={"eur": 2, "amr": 1}, gnomad={"nfe": 1}, revel=0.9, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="7-150951711-G-A", gene="KCNH2", gene_id="ENSG00000055118",
            transcript="ENST00000262186", mane="NM_000238.4", hgvsc="c.1682C>T", hgvsp="p.Ala561Val",
            consequence=("missense_variant",), exon="7/15", rsid="rs121912504",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2025-12-01",
                rcvs=("RCV000015501", "RCV000057941", "RCV000181806", "RCV000229360", "RCV000626630", "RCV000620827"),
                conditions=("Long QT syndrome", "Short QT syndrome type 1"),
            ),
            aou={"eur": 1}, gnomad=None, revel=0.97, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="7-150951793-G-A", gene="KCNH2", gene_id="ENSG00000055118",
            transcript="ENST00000262186", mane="NM_000238.4", hgvsc="c.1600C>T", hgvsp="p.Arg534Cys",
            consequence=("missense_variant",), exon="7/15", rsid="rs199472916",
            clinvar=ClinVar(
                classification="Pathogenic", review_status="criteria provided, multiple submitters, no conflicts",
                last_evaluated="2025-09-23",
                rcvs=("RCV000057929", "RCV000181800", "RCV000470519", "RCV002399420", "RCV006776704"),
                conditions=("Long QT syndrome", "KCNH2-related disorder"),
            ),
            aou={"afr": 1, "eur": 1}, gnomad={"nfe": 1}, revel=0.96, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="3-38551022-C-T", gene="SCN5A", gene_id="ENSG00000183873",
            transcript="ENST00000423572", mane="NM_000335.5", hgvsc="c.5347G>A", hgvsp="p.Glu1783Lys",
            consequence=("missense_variant",), exon="28/28", rsid="rs137854601",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-01-26",
                rcvs=("RCV000009972", "RCV000009973", "RCV000009974", "RCV000058773", "RCV000208193", "RCV000183117"),
                conditions=("Long QT syndrome 3", "Brugada syndrome 1",
                            "Ventricular fibrillation, paroxysmal familial, type 1"),
            ),
            aou={"eur": 2}, gnomad=None, revel=0.89, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="3-38603929-T-C", gene="SCN5A", gene_id="ENSG00000183873",
            transcript="ENST00000423572", mane="NM_000335.5", hgvsc="c.1673A>G", hgvsp="p.His558Arg",
            consequence=("missense_variant",), exon="12/28", rsid="rs1805124",
            clinvar=ClinVar(
                classification="Benign/Likely benign",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-02-04",
                rcvs=("RCV000041604", "RCV000058440", "RCV000251327", "RCV000300603", "RCV000304709", "RCV000361696"),
                conditions=("Brugada syndrome 1", "Cardiac arrhythmia"),
            ),
            # About 1 in 4 alleles everywhere, so the matched cohort looks just like the whole one.
            aou={"eur": 0.22, "afr": 0.29, "amr": 0.18, "eas": 0.09, "sas": 0.16, "mid": 0.2, "oth": 0.21},
            gnomad={"nfe": 0.21, "afr": 0.29, "amr": 0.17, "asj": 0.24, "eas": 0.08, "fin": 0.25, "sas": 0.16,
                    "oth": 0.21},
            revel=0.07, matched=Matched(carriers_ac=62, homozygotes=7),
        ),
        Variant(
            vid="21-34449382-C-T", gene="KCNE1", gene_id="ENSG00000180509",
            transcript="ENST00000399286", mane="NM_000219.6", hgvsc="c.253G>A", hgvsp="p.Asp85Asn",
            consequence=("missense_variant",), exon="4/4", rsid="rs1805128",
            clinvar=ClinVar(
                classification="Conflicting classifications of pathogenicity",
                review_status="criteria provided, conflicting classifications", last_evaluated="2026-01-05",
                rcvs=("RCV000014423", "RCV000014422", "RCV000057858", "RCV000035353", "RCV000157255", "RCV000247942"),
                rcv_classifications=("Uncertain significance", "Pathogenic", "Likely benign",
                                     "Uncertain significance", "Benign", "Uncertain significance"),
                conditions=("Long QT syndrome 5", "Jervell and Lange-Nielsen syndrome 2"),
            ),
            aou={"eur": 0.011, "afr": 0.0012, "amr": 0.005, "oth": 0.007, "sas": 0.004, "mid": 0.008},
            gnomad={"nfe": 0.012, "afr": 0.001, "amr": 0.005, "asj": 0.009, "fin": 0.013, "sas": 0.004, "oth": 0.008},
            revel=0.29, matched=Matched(carriers_ac=6),
        ),
        Variant(
            vid="7-150974917-G-A", gene="KCNH2", gene_id="ENSG00000055118",
            transcript="ENST00000262186", mane="NM_000238.4", hgvsc="c.101C>T", hgvsp="p.Ala34Val",
            consequence=("missense_variant",), exon="2/15", rsid="rs1801941190",
            clinvar=ClinVar(
                classification="Uncertain significance", review_status="criteria provided, single submitter",
                last_evaluated="2024-10-28", rcvs=("RCV006779783",), conditions=(),
            ),
            aou={"eur": 1, "amr": 2}, gnomad={"amr": 1}, revel=0.52, matched=Matched(carriers_ac=0),
        ),
        Variant(
            vid="11-2778015-G-A", gene="KCNQ1", gene_id="ENSG00000053918",
            transcript="ENST00000155840", mane="NM_000218.3", hgvsc="c.1772G>A", hgvsp="p.Arg591His",
            consequence=("missense_variant",), exon="15/16", rsid="rs199472814",
            clinvar=ClinVar(
                classification="Pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2025-09-10",
                rcvs=("RCV000057636", "RCV000505785", "RCV000678914", "RCV001388792", "RCV002399408", "RCV006547566"),
                conditions=("Long QT syndrome 1", "Long QT syndrome"),
            ),
            aou={"eur": 2}, gnomad={"nfe": 1},
            revel=0.96, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="11-2778024-G-A", gene="KCNQ1", gene_id="ENSG00000053918",
            transcript="ENST00000155840", mane="NM_000218.3", hgvsc="c.1781G>A", hgvsp="p.Arg594Gln",
            consequence=("missense_variant",), exon="15/16", rsid="rs199472815",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-05-27",
                rcvs=("RCV000046031", "RCV000057637", "RCV000182228", "RCV000247524", "RCV001258107", "RCV001731336"),
                conditions=("Long QT syndrome 1", "Congenital long QT syndrome"),
            ),
            aou={"eur": 2, "amr": 1}, gnomad={"nfe": 1},
            revel=0.92, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="7-150951511-C-T", gene="KCNH2", gene_id="ENSG00000055118",
            transcript="ENST00000262186", mane="NM_000238.4", hgvsc="c.1882G>A", hgvsp="p.Gly628Ser",
            consequence=("missense_variant",), exon="7/15", rsid="rs121912507",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2025-10-31",
                rcvs=("RCV000015508", "RCV000058029", "RCV000223848", "RCV000822422", "RCV002408467", "RCV004549371"),
                conditions=("Long QT syndrome 2", "Long QT syndrome"),
            ),
            aou={"eur": 1}, gnomad=None,
            revel=0.98, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="3-38551504-C-T", gene="SCN5A", gene_id="ENSG00000183873",
            transcript="ENST00000423572", mane="NM_000335.5", hgvsc="c.4865G>A", hgvsp="p.Arg1622Gln",
            consequence=("missense_variant",), exon="28/28", rsid="rs137854600",
            clinvar=ClinVar(
                classification="Pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2025-09-19",
                rcvs=("RCV000009970", "RCV000009971", "RCV000058716", "RCV001588806", "RCV004984637", "RCV006937967"),
                conditions=("SCN5A-related disorder",),
            ),
            aou={"eur": 1}, gnomad=None,
            revel=0.97, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="7-150948446-T-G", gene="KCNH2", gene_id="ENSG00000055118",
            transcript="ENST00000262186", mane="NM_000238.4", hgvsc="c.2690A>C", hgvsp="p.Lys897Thr",
            consequence=("missense_variant", "splice_region_variant",), exon="11/15", rsid="rs1805123",
            clinvar=ClinVar(
                classification="Benign",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-02-04",
                rcvs=("RCV000058152", "RCV000171815", "RCV000223864", "RCV000249181", "RCV000276195", "RCV001095232"),
                conditions=("Long QT syndrome 2", "Atrial fibrillation"),
            ),
            # A very common benign KCNH2 variant: right at background.
            aou={"eur": 0.2, "afr": 0.04, "amr": 0.13, "eas": 0.05, "sas": 0.14, "mid": 0.18, "oth": 0.14}, gnomad={"nfe": 0.21, "afr": 0.035, "amr": 0.12, "asj": 0.18, "eas": 0.04, "fin": 0.25, "sas": 0.13, "oth": 0.16},
            revel=0.05, matched=Matched(carriers_ac=38, homozygotes=3),
        ),
        Variant(
            vid="3-38579416-G-T", gene="SCN5A", gene_id="ENSG00000183873",
            transcript="ENST00000423572", mane="NM_000335.5", hgvsc="c.3305C>A", hgvsp="p.Ser1102Tyr",
            consequence=("missense_variant",), exon="18/28", rsid="rs7626962",
            clinvar=ClinVar(
                classification="Conflicting classifications of pathogenicity",
                review_status="criteria provided, conflicting classifications", last_evaluated="2026-02-04",
                rcvs=("RCV000009992", "RCV000041615", "RCV000058563", "RCV000204216", "RCV000274325", "RCV000304064"),
                rcv_classifications=("Benign", "Uncertain significance", "Likely benign", "Uncertain significance", "Benign", "Likely benign"),
                conditions=("Sick sinus syndrome 1", "Cardiac arrhythmia"),
            ),
            # Common in African ancestry (about 8% of alleles), and about as common among the matched.
            aou={"afr": 0.085, "amr": 0.008, "oth": 0.02, "eur": 0.0004, "mid": 0.003}, gnomad={"afr": 0.08, "amr": 0.006, "oth": 0.012, "nfe": 0.0003},
            revel=0.23, matched=Matched(carriers_ac=5),
        ),
        Variant(
            vid="7-150974885-T-G", gene="KCNH2", gene_id="ENSG00000055118",
            transcript="ENST00000262186", mane="NM_000238.4", hgvsc="c.133A>C", hgvsp="p.Asn45His",
            consequence=("missense_variant",), exon="2/15", rsid=None,
            clinvar=ClinVar(
                classification="Uncertain significance", review_status="criteria provided, single submitter",
                last_evaluated="2019-12-23", rcvs=("RCV006779780",), conditions=(),
            ),
            aou=None, gnomad=None,
        ),
    ),
)
