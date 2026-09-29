"""
Hypertrophic cardiomyopathy: sarcomere genes (MYH7, MYBPC3, TNNT2, TNNI3, TPM1, ACTC1).

The story: the classic expert-panel MYH7 variants (p.Arg403Gln, p.Arg453Cys, p.Arg719Trp) and
MYBPC3's most common founder variant (p.Arg502Trp) are all strongly enriched in the matched
cohort, with TPM1 and ACTC1 variants alongside. Against them: a common benign MYBPC3 variant at
background, and TNNT2's legacy "R278C", once reported as pathogenic and now likely benign, in
nobody matched. A MYBPC3 VUS seen mostly in African-ancestry participants turns up in nobody
matched too, and a second VUS isn't in All of Us at all.

Variants checked against ClinVar (esummary) and Ensembl VEP (MANE Select), 2026-09-28. TNNT2's
p.Arg102Gln and p.Arg288Cys are the legacy "R92Q" and "R278C", renumbered on the MANE transcript.
"""

from .common import ClinVar, Condition, Matched, UseCase, Variant

EXPERT_PANEL_HCM = dict(
    classification="Pathogenic", review_status="reviewed by expert panel",
    last_evaluated="2016-12-15", conditions=("Hypertrophic cardiomyopathy",),
)

CASE = UseCase(
    key="hypertrophic_cardiomyopathy",
    title="Hypertrophic cardiomyopathy",
    description="Sarcomere genes, including the classic expert-panel MYH7 and MYBPC3 variants.",
    condition=Condition(
        concept_id=9000040, name="Hypertrophic cardiomyopathy", est_count=212, participants=214,
        synonyms=("hcm", "hocm", "hypertrophic obstructive cardiomyopathy"),
    ),
    ancestry={"EUR": 118, "AFR": 38, "AMR": 30, "OTH": 16, "EAS": 6, "SAS": 4, "MID": 2},
    age={"18–29": 12, "30–39": 24, "40–49": 38, "50–59": 52, "60–69": 54, "70+": 34},
    variants=(
        Variant(
            vid="14-23429278-C-T", gene="MYH7", gene_id="ENSG00000092054",
            transcript="ENST00000355349", mane="NM_000257.4", hgvsc="c.1208G>A", hgvsp="p.Arg403Gln",
            consequence=("missense_variant",), exon="13/40", rsid="rs121913624",
            clinvar=ClinVar(rcvs=("RCV000015143", "RCV000035708", "RCV000158788", "RCV000199447", "RCV001798006",
                                  "RCV002345242"), **EXPERT_PANEL_HCM),
            aou={"eur": 3}, gnomad=None, revel=0.94, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="14-23429005-G-A", gene="MYH7", gene_id="ENSG00000092054",
            transcript="ENST00000355349", mane="NM_000257.4", hgvsc="c.1357C>T", hgvsp="p.Arg453Cys",
            consequence=("missense_variant",), exon="14/40", rsid="rs121913625",
            clinvar=ClinVar(rcvs=("RCV000015145", "RCV000035717", "RCV000158799", "RCV000230258", "RCV000618958",
                                  "RCV001375645"), **EXPERT_PANEL_HCM),
            aou={"eur": 2, "amr": 1}, gnomad={"nfe": 1}, revel=0.96, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="14-23425971-G-A", gene="MYH7", gene_id="ENSG00000092054",
            transcript="ENST00000355349", mane="NM_000257.4", hgvsc="c.2155C>T", hgvsp="p.Arg719Trp",
            consequence=("missense_variant",), exon="19/40", rsid="rs121913637",
            clinvar=ClinVar(rcvs=("RCV000015160", "RCV000158512", "RCV000241836", "RCV000758071", "RCV001170501",
                                  "RCV001194067"), **EXPERT_PANEL_HCM),
            aou={"eur": 2}, gnomad=None, revel=0.95, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="11-47342698-G-A", gene="MYBPC3", gene_id="ENSG00000134571",
            transcript="ENST00000545968", mane="NM_000256.3", hgvsc="c.1504C>T", hgvsp="p.Arg502Trp",
            consequence=("missense_variant",), exon="17/35", rsid="rs375882485",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-03-04",
                rcvs=("RCV000035406", "RCV000203913", "RCV000223898", "RCV000252398", "RCV000584810", "RCV000677196"),
                conditions=("Hypertrophic cardiomyopathy 4", "MYBPC3-related cardiomyopathies"),
            ),
            # The most common HCM variant in European-ancestry cohorts.
            aou={"eur": 21, "oth": 2, "amr": 1}, gnomad={"nfe": 6}, revel=0.88,
            matched=Matched(carriers_ac=6),
        ),
        Variant(
            vid="11-47348424-C-T", gene="MYBPC3", gene_id="ENSG00000134571",
            transcript="ENST00000545968", mane="NM_000256.3", hgvsc="c.772G>A", hgvsp="p.Glu258Lys",
            # The last base of exon 6: missense, but it's the splicing it breaks that's pathogenic.
            consequence=("missense_variant", "splice_region_variant"), exon="6/35", rsid="rs397516074",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-02-02",
                rcvs=("RCV000035668", "RCV000161125", "RCV000205517", "RCV000158310", "RCV000247227", "RCV000763244"),
                conditions=("Hypertrophic cardiomyopathy 4", "Left ventricular noncompaction 10"),
            ),
            aou={"eur": 6, "amr": 1}, gnomad={"nfe": 2}, revel=0.71, splice_ai=0.58,
            matched=Matched(carriers_ac=3),
        ),
        Variant(
            vid="1-201365297-C-T", gene="TNNT2", gene_id="ENSG00000118194",
            transcript="ENST00000656932", mane="NM_001276345.2", hgvsc="c.305G>A", hgvsp="p.Arg102Gln",
            consequence=("missense_variant",), exon="10/17", rsid="rs121964856",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-01-21",
                rcvs=("RCV000013220", "RCV000211865", "RCV000159281", "RCV000621709", "RCV000627784", "RCV003450626"),
                conditions=("Hypertrophic cardiomyopathy 2", "Dilated cardiomyopathy 1D",
                            "Cardiomyopathy, familial restrictive, 3"),
            ),
            aou={"eur": 3, "afr": 1}, gnomad={"nfe": 1}, revel=0.83, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="19-55154146-G-C", gene="TNNI3", gene_id="ENSG00000129991",
            transcript="ENST00000344887", mane="NM_000363.5", hgvsc="c.433C>G", hgvsp="p.Arg145Gly",
            consequence=("missense_variant",), exon="7/8", rsid="rs104894724",
            clinvar=ClinVar(
                classification="Pathogenic", review_status="criteria provided, multiple submitters, no conflicts",
                last_evaluated="2024-01-04",
                rcvs=("RCV000013231", "RCV000251781", "RCV000441050", "RCV000557688", "RCV001798003"),
                conditions=("Hypertrophic cardiomyopathy 7", "Cardiomyopathy"),
            ),
            aou={"eur": 1, "oth": 1}, gnomad=None, revel=0.9, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="11-47351379-G-A", gene="MYBPC3", gene_id="ENSG00000134571",
            transcript="ENST00000545968", mane="NM_000256.3", hgvsc="c.152C>T", hgvsp="p.Ala51Val",
            consequence=("missense_variant",), exon="2/35", rsid="rs746738538",
            clinvar=ClinVar(
                classification="Uncertain significance", review_status="criteria provided, single submitter",
                last_evaluated="2024-09-10", rcvs=("RCV006829806",), conditions=(),
            ),
            aou={"afr": 12, "eur": 7, "amr": 2}, gnomad={"afr": 3, "nfe": 1}, revel=0.27,
            matched=Matched(carriers_ac=0),
        ),
        Variant(
            vid="14-23425760-C-T", gene="MYH7", gene_id="ENSG00000092054",
            transcript="ENST00000355349", mane="NM_000257.4", hgvsc="c.2221G>A", hgvsp="p.Gly741Arg",
            consequence=("missense_variant",), exon="20/40", rsid="rs121913632",
            clinvar=ClinVar(
                classification="Pathogenic/Likely pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-04-23",
                rcvs=("RCV000158521", "RCV000243586", "RCV000461730", "RCV001170500", "RCV004534738", "RCV005888986"),
                conditions=("Hypertrophic cardiomyopathy 1", "Hypertrophic cardiomyopathy"),
            ),
            aou={"eur": 2, "amr": 1}, gnomad={"nfe": 1},
            revel=0.95, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="14-23426833-C-T", gene="MYH7", gene_id="ENSG00000092054",
            transcript="ENST00000355349", mane="NM_000257.4", hgvsc="c.1988G>A", hgvsp="p.Arg663His",
            consequence=("missense_variant",), exon="18/40", rsid="rs371898076",
            clinvar=ClinVar(
                classification="Pathogenic",
                review_status="reviewed by expert panel", last_evaluated="2016-12-15",
                rcvs=("RCV000035758", "RCV000162333", "RCV000158822", "RCV000168409", "RCV000253409", "RCV000477919"),
                conditions=("Hypertrophic cardiomyopathy",),
            ),
            aou={"eur": 3, "afr": 1}, gnomad={"nfe": 2},
            revel=0.93, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="11-47342719-G-A", gene="MYBPC3", gene_id="ENSG00000134571",
            transcript="ENST00000545968", mane="NM_000256.3", hgvsc="c.1483C>T", hgvsp="p.Arg495Trp",
            consequence=("missense_variant",), exon="17/35", rsid="rs397515905",
            clinvar=ClinVar(
                classification="Likely pathogenic",
                review_status="reviewed by expert panel", last_evaluated="2025-11-14",
                rcvs=("RCV000543508", "RCV000770365", "RCV001193929", "RCV001265564", "RCV001698977", "RCV002390322"),
                conditions=("Hypertrophic cardiomyopathy",),
            ),
            aou={"eur": 4}, gnomad={"nfe": 1},
            revel=0.86, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="15-63060899-G-A", gene="TPM1", gene_id="ENSG00000140416",
            transcript="ENST00000403994", mane="NM_001018005.2", hgvsc="c.523G>A", hgvsp="p.Asp175Asn",
            consequence=("missense_variant",), exon="5/10", rsid="rs104894503",
            clinvar=ClinVar(
                classification="Pathogenic",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-01-31",
                rcvs=("RCV000013272", "RCV000159366", "RCV000474684", "RCV000622165", "RCV001197088", "RCV001170568"),
                conditions=("Hypertrophic cardiomyopathy", "Primary dilated cardiomyopathy"),
            ),
            aou={"eur": 2}, gnomad=None,
            revel=0.92, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="15-34793398-C-T", gene="ACTC1", gene_id="ENSG00000159251",
            transcript="ENST00000290378", mane="NM_005159.5", hgvsc="c.301G>A", hgvsp="p.Glu101Lys",
            consequence=("missense_variant",), exon="3/7", rsid="rs193922680",
            clinvar=ClinVar(
                classification="Pathogenic",
                review_status="reviewed by expert panel", last_evaluated="2025-11-14",
                rcvs=("RCV000019996", "RCV000019997", "RCV000029295", "RCV000157780", "RCV000684792", "RCV000769471"),
                conditions=("Hypertrophic cardiomyopathy",),
            ),
            aou={"eur": 1, "amr": 1}, gnomad=None,
            revel=0.97, matched=Matched(carriers_ac=1),
        ),
        Variant(
            vid="1-201359245-G-A", gene="TNNT2", gene_id="ENSG00000118194",
            transcript="ENST00000656932", mane="NM_001276345.2", hgvsc="c.862C>T", hgvsp="p.Arg288Cys",
            consequence=("missense_variant",), exon="17/17", rsid="rs121964857",
            clinvar=ClinVar(
                classification="Likely benign",
                review_status="reviewed by expert panel", last_evaluated="2025-11-14",
                rcvs=("RCV000013222", "RCV000036622", "RCV000159322", "RCV000162331", "RCV000203739", "RCV000248304"),
                conditions=("Hypertrophic cardiomyopathy",),
            ),
            # The legacy "R278C": once reported as pathogenic, now likely benign by the expert panel.
            aou={"eur": 0.0009, "afr": 0.0002, "amr": 0.0004, "oth": 0.0006}, gnomad={"nfe": 0.0008, "afr": 0.0002, "amr": 0.0003, "fin": 0.0005},
            revel=0.41, matched=Matched(carriers_ac=0),
        ),
        Variant(
            vid="11-47335928-C-T", gene="MYBPC3", gene_id="ENSG00000134571",
            transcript="ENST00000545968", mane="NM_000256.3", hgvsc="c.2686G>A", hgvsp="p.Val896Met",
            consequence=("missense_variant",), exon="26/35", rsid="rs35078470",
            clinvar=ClinVar(
                classification="Benign/Likely benign",
                review_status="criteria provided, multiple submitters, no conflicts", last_evaluated="2026-06-01",
                rcvs=("RCV000035521", "RCV000143915", "RCV000204363", "RCV000251320", "RCV000602093", "RCV000776054"),
                conditions=("Hypertrophic cardiomyopathy 4", "Left ventricular noncompaction 10"),
            ),
            # Common background: about as frequent in the matched cohort as in everyone.
            aou={"eur": 0.006, "afr": 0.0015, "amr": 0.003, "eas": 0.002, "oth": 0.004}, gnomad={"nfe": 0.0058, "afr": 0.0012, "amr": 0.0028, "asj": 0.004, "eas": 0.002, "fin": 0.007, "oth": 0.004},
            revel=0.18, matched=Matched(carriers_ac=2),
        ),
        Variant(
            vid="11-47349908-A-C", gene="MYBPC3", gene_id="ENSG00000134571",
            transcript="ENST00000545968", mane="NM_000256.3", hgvsc="c.520T>G", hgvsp="p.Phe174Val",
            consequence=("missense_variant",), exon="5/35", rsid=None,
            clinvar=ClinVar(
                classification="Uncertain significance", review_status="criteria provided, single submitter",
                last_evaluated="2023-02-20", rcvs=("RCV006816162",), conditions=(),
            ),
            aou=None, gnomad=None,
        ),
    ),
)
