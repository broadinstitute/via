"""
Tetralogy of Fallot: congenital heart disease genes (NKX2-5, GATA4, GATA6, TBX1, TBX5, JAG1,
FLT4, NOTCH1, ZFPM2).

The story: two truncating variants and a handful of rare missense variants sit in the matched
cohort far above their All of Us frequency, against a common benign ZFPM2 variant that sits at
background and conflicting or benign NKX2-5 and NOTCH1 variants no matched participant carries.
Holt-Oram TBX5 variants and a JAG1 variant ClinVar itself links to Tetralogy of Fallot round out
the enriched set. One GATA4 VUS is enriched (worth a look); the other isn't in All of Us at all.

Variants checked against ClinVar (esummary) and Ensembl VEP (MANE Select), 2026-09-28. The
condition is the base fixture's 9000010, whose 49 participants that fixture owns.
"""

from .common import ClinVar, Condition, Matched, UseCase, Variant

CASE = UseCase(
    key="tetralogy_of_fallot",
    title="Tetralogy of Fallot",
    description="Congenital heart disease genes, with two truncating variants enriched in affected participants.",
    condition=Condition(
        concept_id=9000010, name="Tetralogy of Fallot", est_count=47, participants=49, generate=False,
    ),
    ancestry={"EUR": 22, "AFR": 9, "AMR": 10, "OTH": 4, "EAS": 2, "SAS": 1, "MID": 1},
    # Repaired in childhood, so the adult cohort skews young.
    age={"18–29": 14, "30–39": 13, "40–49": 10, "50–59": 7, "60–69": 4, "70+": 1},
    variants=(
        Variant(
            vid="5-173235011-G-A", gene="NKX2-5", gene_id="ENSG00000183072",
            transcript="ENST00000329198", mane="NM_004387.4", hgvsc="c.73C>T", hgvsp="p.Arg25Cys",
            consequence=("missense_variant",), exon="1/2", rsid="rs28936670",
            clinvar=ClinVar(
                classification="Conflicting classifications of pathogenicity",
                review_status="criteria provided, conflicting classifications", last_evaluated="2026-03-01",
                rcvs=("RCV000009572", "RCV000009573", "RCV000023019", "RCV000030339", "RCV000023017", "RCV000037968"),
                rcv_classifications=("Uncertain significance", "Likely benign", "Uncertain significance",
                                     "Pathogenic", "Benign", "Uncertain significance"),
                conditions=("Atrial septal defect 7", "Cardiovascular phenotype"),
            ),
            # Most common in African-ancestry participants, as in gnomAD.
            aou={"afr": 0.009, "amr": 0.0011, "eur": 0.0002, "oth": 0.002},
            gnomad={"afr": 0.0075, "amr": 0.001, "nfe": 0.0001, "oth": 0.0015},
            revel=0.42, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="5-173233036-G-A", gene="NKX2-5", gene_id="ENSG00000183072",
            transcript="ENST00000329198", mane="NM_004387.4", hgvsc="c.508C>T", hgvsp="p.Gln170Ter",
            consequence=("stop_gained",), exon="2/2", rsid="rs104893901",
            clinvar=ClinVar(
                classification="Pathogenic", review_status="criteria provided, single submitter",
                last_evaluated="2023-07-16", rcvs=("RCV000009569",), conditions=("Atrial septal defect 7",),
            ),
            aou={"eur": 2}, gnomad=None, lof="HC", matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="8-11750213-G-A", gene="GATA4", gene_id="ENSG00000136574",
            transcript="ENST00000532059", mane="NM_001308093.3", hgvsc="c.889G>A", hgvsp="p.Gly297Ser",
            consequence=("missense_variant",), exon="4/7", rsid="rs104894073",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2025-04-28",
                rcvs=("RCV000009596", "RCV001775066", "RCV005089220", "RCV005867737", "RCV006776587"),
                conditions=("Atrioventricular septal defect 4", "Transposition of the great arteries",
                            "GATA4-related dilated cardiomyopathy"),
            ),
            aou={"eur": 5, "amr": 1}, gnomad={"nfe": 2}, revel=0.91, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="20-10652533-C-T", gene="JAG1", gene_id="ENSG00000101384",
            transcript="ENST00000254958", mane="NM_000214.3", hgvsc="c.821G>A", hgvsp="p.Gly274Asp",
            consequence=("missense_variant",), exon="6/26", rsid="rs28939668",
            clinvar=ClinVar(
                classification="Likely pathogenic", review_status="criteria provided, single submitter",
                last_evaluated="2017-04-30", rcvs=("RCV000008063", "RCV000555146"),
                conditions=("Alagille syndrome due to a JAG1 point mutation",),
            ),
            aou={"afr": 1, "eur": 2}, gnomad={"nfe": 1}, revel=0.87, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="22-19763273-T-A", gene="TBX1", gene_id="ENSG00000184058",
            transcript="ENST00000649276", mane="NM_001379200.1", hgvsc="c.470T>A", hgvsp="p.Phe157Tyr",
            consequence=("missense_variant",), exon="2/7", rsid="rs28939675",
            clinvar=ClinVar(
                classification="Pathogenic", review_status="no assertion criteria provided",
                last_evaluated="2007-03-01", rcvs=("RCV001815165",), conditions=("Conotruncal anomaly face syndrome",),
            ),
            aou={"eur": 1}, gnomad=None, revel=0.79, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="8-105419192-A-G", gene="ZFPM2", gene_id="ENSG00000169946",
            transcript="ENST00000407775", mane="NM_012082.4", hgvsc="c.89A>G", hgvsp="p.Glu30Gly",
            consequence=("missense_variant",), exon="2/8", rsid="rs121908601",
            clinvar=ClinVar(
                classification="Benign/Likely benign",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-06-01",
                rcvs=("RCV000006502", "RCV000032713", "RCV000172841", "RCV000461090", "RCV001007696", "RCV001818141"),
                conditions=("46,XY sex reversal 9",),
            ),
            # Common background: about what you'd expect by chance in 49 people.
            aou={"eur": 0.0081, "afr": 0.0019, "amr": 0.0042, "oth": 0.0055, "eas": 0.0003, "sas": 0.0024, "mid": 0.006},
            gnomad={"nfe": 0.0078, "afr": 0.0021, "amr": 0.0039, "asj": 0.0062, "eas": 0.0004, "fin": 0.0069,
                    "sas": 0.0026, "oth": 0.0051},
            revel=0.11, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="5-180616905-G-A", gene="FLT4", gene_id="ENSG00000037280",
            transcript="ENST00000261937", mane="NM_182925.5", hgvsc="c.3091C>T", hgvsp="p.Arg1031Ter",
            consequence=("stop_gained",), exon="22/30", rsid=None,
            clinvar=ClinVar(
                classification="Pathogenic", review_status="criteria provided, single submitter",
                last_evaluated="2026-01-27", rcvs=("RCV006755185",), conditions=(),
            ),
            aou={"afr": 1, "amr": 1}, gnomad={"afr": 1}, lof="HC", matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="9-136515323-C-T", gene="NOTCH1", gene_id="ENSG00000148400",
            transcript="ENST00000651671", mane="NM_017617.5", hgvsc="c.1981G>A", hgvsp="p.Gly661Ser",
            consequence=("missense_variant",), exon="12/34", rsid="rs201077220",
            clinvar=ClinVar(
                classification="Conflicting classifications of pathogenicity",
                review_status="criteria provided, conflicting classifications", last_evaluated="2026-09-09",
                rcvs=("RCV000519623", "RCV000555279", "RCV001535730", "RCV002285156", "RCV002272196", "RCV002311210"),
                rcv_classifications=("Uncertain significance", "Likely benign", "Uncertain significance",
                                     "Likely pathogenic", "Uncertain significance", "Benign"),
                conditions=("Adams-Oliver syndrome 5", "Aortic valve disease 1",
                            "Familial thoracic aortic aneurysm and aortic dissection"),
            ),
            aou={"afr": 0.0012, "eur": 0.0004, "amr": 0.0003}, gnomad={"afr": 0.0009, "nfe": 0.0002},
            revel=0.38, matched=Matched(carriers_ac=0),
        ),
        Variant(
            vid="8-11748997-G-A", gene="GATA4", gene_id="ENSG00000136574",
            transcript="ENST00000532059", mane="NM_001308093.3", hgvsc="c.698G>A", hgvsp="p.Gly233Glu",
            consequence=("missense_variant",), exon="3/7", rsid=None,
            clinvar=ClinVar(
                classification="Uncertain significance", review_status="criteria provided, single submitter",
                last_evaluated="2022-04-14", rcvs=("RCV006787575",), conditions=(),
            ),
            aou={"amr": 1}, gnomad=None, revel=0.63, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="12-114401830-C-T", gene="TBX5", gene_id="ENSG00000089225",
            transcript="ENST00000405440", mane="NM_181486.4", hgvsc="c.238G>A", hgvsp="p.Gly80Arg",
            consequence=("missense_variant",), exon="3/9", rsid="rs104894381",
            clinvar=ClinVar(
                classification="Pathogenic",
                review_status="no assertion criteria provided", last_evaluated="1999-03-16",
                rcvs=("RCV000008458",),
                conditions=("Holt-Oram syndrome",),
            ),
            aou={"eur": 1}, gnomad=None,
            revel=0.9, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="12-114385521-C-T", gene="TBX5", gene_id="ENSG00000089225",
            transcript="ENST00000405440", mane="NM_181486.4", hgvsc="c.710G>A", hgvsp="p.Arg237Gln",
            consequence=("missense_variant",), exon="7/9", rsid="rs104894378",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-06-19",
                rcvs=("RCV000008457", "RCV000196777", "RCV000474989", "RCV002362569", "RCV006830954"),
                conditions=("Holt-Oram syndrome", "Aortic valve disease 2"),
            ),
            aou={"eur": 2, "amr": 1}, gnomad={"nfe": 1},
            revel=0.95, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="20-10658611-C-T", gene="JAG1", gene_id="ENSG00000101384",
            transcript="ENST00000254958", mane="NM_000214.3", hgvsc="c.551G>A", hgvsp="p.Arg184His",
            consequence=("missense_variant",), exon="4/26", rsid="rs121918351",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2024-03-29",
                rcvs=("RCV000008059", "RCV000725979", "RCV002476943", "RCV005002140", "RCV006905029"),
                conditions=("Tetralogy of Fallot", "Alagille syndrome due to a JAG1 point mutation", "Deafness, congenital heart defects, and posterior embryotoxon"),
            ),
            aou={"eur": 1, "afr": 1}, gnomad=None,
            revel=0.94, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="18-22181516-C-T", gene="GATA6", gene_id="ENSG00000141448",
            transcript="ENST00000269216", mane="NM_005257.6", hgvsc="c.1366C>T", hgvsp="p.Arg456Cys",
            consequence=("missense_variant",), exon="4/7", rsid="rs387906818",
            clinvar=ClinVar(
                classification="Pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2025-05-07",
                rcvs=("RCV000023135", "RCV000191918", "RCV003236769", "RCV004975265", "RCV005603589"),
                conditions=("Atrioventricular septal defect 5", "Pancreatic hypoplasia-diabetes-congenital heart disease syndrome"),
            ),
            aou={"eur": 1}, gnomad=None,
            revel=0.96, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="5-173235023-C-G", gene="NKX2-5", gene_id="ENSG00000183072",
            transcript="ENST00000329198", mane="NM_004387.4", hgvsc="c.61G>C", hgvsp="p.Glu21Gln",
            consequence=("missense_variant",), exon="1/2", rsid="rs104893904",
            clinvar=ClinVar(
                classification="Conflicting classifications of pathogenicity",
                review_status="criteria provided, conflicting classifications", last_evaluated="2026-01-27",
                rcvs=("RCV000009574", "RCV000030618", "RCV000171013", "RCV000618034", "RCV000514277", "RCV000987633"),
                rcv_classifications=("Uncertain significance", "Likely benign", "Uncertain significance", "Pathogenic", "Uncertain significance", "Benign"),
                conditions=("Atrial septal defect 7",),
            ),
            aou={"eur": 0.0011, "afr": 0.0003, "amr": 0.0006, "oth": 0.0008}, gnomad={"nfe": 0.001, "afr": 0.0002, "amr": 0.0005, "fin": 0.0004},
            revel=0.35, matched=Matched(carriers_ac=0),
        ),
        Variant(
            vid="9-136506781-C-T", gene="NOTCH1", gene_id="ENSG00000148400",
            transcript="ENST00000651671", mane="NM_017617.5", hgvsc="c.3836G>A", hgvsp="p.Arg1279His",
            consequence=("missense_variant",), exon="23/34", rsid="rs61751543",
            clinvar=ClinVar(
                classification="Benign/Likely benign",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-06-01",
                rcvs=("RCV000121680", "RCV000229594", "RCV001291515", "RCV001699039", "RCV002269856", "RCV002313937"),
                conditions=("Adams-Oliver syndrome 5", "Aortic valve disease 1"),
            ),
            # Common in African-ancestry participants, and carried by none of the matched ones.
            aou={"afr": 0.012, "amr": 0.002, "eur": 0.0006, "oth": 0.003}, gnomad={"afr": 0.011, "amr": 0.002, "nfe": 0.0005, "oth": 0.003},
            revel=0.12, matched=Matched(carriers_ac=0),
        ),
        Variant(
            vid="8-11748951-T-C", gene="GATA4", gene_id="ENSG00000136574",
            transcript="ENST00000532059", mane="NM_001308093.3", hgvsc="c.652T>C", hgvsp="p.Cys218Arg",
            consequence=("missense_variant",), exon="3/7", rsid=None,
            clinvar=ClinVar(
                classification="Uncertain significance", review_status="criteria provided, single submitter",
                last_evaluated="2023-11-24", rcvs=("RCV006787574",), conditions=(),
            ),
            # Not in All of Us, so not in the VAT.
            aou=None, gnomad=None,
        ),
    ),
)
