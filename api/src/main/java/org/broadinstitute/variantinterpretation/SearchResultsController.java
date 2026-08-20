package org.broadinstitute.variantinterpretation;

import java.math.BigDecimal;
import java.util.List;
import org.broadinstitute.variantinterpretation.api.SearchResultsApi;
import org.broadinstitute.variantinterpretation.model.BreakdownSegment;
import org.broadinstitute.variantinterpretation.model.CohortVariant;
import org.broadinstitute.variantinterpretation.model.FilteredVariant;
import org.broadinstitute.variantinterpretation.model.PhenotypeCrosswalk;
import org.broadinstitute.variantinterpretation.model.SearchResultsResponse;
import org.broadinstitute.variantinterpretation.model.SearchSummary;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SearchResultsController implements SearchResultsApi {

  @Override
  public ResponseEntity<SearchResultsResponse> searchResults() {
    return ResponseEntity.ok(
        new SearchResultsResponse()
            .searchSummary(searchSummary())
            .phenotypeCrosswalk(phenotypeCrosswalk())
            .ancestryBreakdown(ancestryBreakdown())
            .ageBreakdown(ageBreakdown())
            .cohortVariants(cohortVariants())
            .filteredVariants(filteredVariants()));
  }

  private static SearchSummary searchSummary() {
    return new SearchSummary()
        .variantsRaw(
            """
            8-11708582-C-T
            8-11708590-G-GAA
            8-11708598-T-C
            8-11708605-A-G
            8-11708613-C-T
            8-11708621-G-T
            8-11708629-T-A
            8-11708637-A-C
            8-11708645-CGGGG-C
            8-11708653-A-G
            8-11708661-C-T
            8-11708669-G-A
            8-11708677-T-C
            8-11708685-A-T
            8-11708693-C-G
            8-11708701-G-T
            8-11708709-A-C
            8-11708717-T-G
            8-11708725-C-A
            8-11708733-G-C
            8-11708741-A-G"""
                .stripIndent()
                .stripTrailing())
        .variantsEnteredCount(21)
        .variantsLimit(50)
        .hpoTerm("HP:0001636");
  }

  private static PhenotypeCrosswalk phenotypeCrosswalk() {
    return new PhenotypeCrosswalk()
        .hpoCode("HP:0001636")
        .omopCode("313867")
        .description("Tetralogy of Fallot")
        .participantCount(214);
  }

  // Counts sum to phenotypeCrosswalk().participantCount (214); percent is each count's
  // share of that total, rounded to 1 decimal, so the two stay consistent with each other.
  private static List<BreakdownSegment> ancestryBreakdown() {
    return List.of(
        segment("EUR", 103, 48.1, "#F9C854"),
        segment("AFR", 42, 19.6, "#2078B4"),
        segment("AMR", 38, 17.8, "#6DACE4"),
        segment("OTH", 19, 8.9, "#B3AEAD"),
        segment("EAS", 7, 3.3, "#A27BD7"),
        segment("SAS", 4, 1.9, "#8CCA90"),
        segment("MID", 1, 0.5, "#CB2D4C"));
  }

  private static List<BreakdownSegment> ageBreakdown() {
    return List.of(
        segment("18–29", 17, 7.9, "#B8DCEF"),
        segment("30–39", 30, 14.0, "#8DC6E5"),
        segment("40–49", 46, 21.5, "#5FAEDA"),
        segment("50–59", 56, 26.2, "#3B8FC4"),
        segment("60–69", 47, 22.0, "#2569A0"),
        segment("70+", 18, 8.4, "#17456F"));
  }

  private static BreakdownSegment segment(String label, int count, double percent, String color) {
    return new BreakdownSegment().label(label).count(count).percent(BigDecimal.valueOf(percent)).color(color);
  }

  // gnomAD AN per row is that subpopulation's approximate real v3.1.2 genome sample size
  // (2x for diploid AN) — much smaller than AoU's, since gnomAD is a smaller reference
  // database. AC is AoU's AF applied to that smaller AN, so gnomAD's rate tracks AoU's
  // rather than being sized as if gnomAD had as many samples as AoU.
  private static List<CohortVariant> cohortVariants() {
    return List.of(
        annotatedVariant(
            "8-11708582-C-T", "Missense", "p.Arg115Cys", CohortVariant.AouSubpopulationEnum.EUR, 0.0034, 1735,
            517466, CohortVariant.GnomadSubpopulationEnum.NFE, 0.0034, 231, 68058,
            CohortVariant.ClinvarSignificanceEnum.VUS, 0.09, null),
        annotatedVariant(
            "8-11708590-G-GAA", "Frameshift", "p.Gly118fs", CohortVariant.AouSubpopulationEnum.AFR, 0.0018, 388,
            211058, CohortVariant.GnomadSubpopulationEnum.AFR, 0.0018, 75, 41488,
            CohortVariant.ClinvarSignificanceEnum.PATHOGENIC, 0.07, CohortVariant.PlofEnum.HC),
        annotatedVariant(
            "8-11708598-T-C", "Synonymous", "p.Leu121=", CohortVariant.AouSubpopulationEnum.EUR, 0.05, 25895, 517466,
            CohortVariant.GnomadSubpopulationEnum.NFE, 0.05, 3403, 68058,
            CohortVariant.ClinvarSignificanceEnum.BENIGN, 0.02, null),
        annotatedVariant(
            "8-11708605-A-G", "Missense", "p.Asp124Gly", CohortVariant.AouSubpopulationEnum.AMR, 0.0062, 1190,
            190702, CohortVariant.GnomadSubpopulationEnum.AMR, 0.0062, 95, 15294,
            CohortVariant.ClinvarSignificanceEnum.VUS, 0.04, null),
        annotatedVariant(
            "8-11708613-C-T", "Nonsense", "p.Arg127Ter", CohortVariant.AouSubpopulationEnum.EUR, 0.0002, 127, 517466,
            CohortVariant.GnomadSubpopulationEnum.FIN, 0.0002, 2, 10488,
            CohortVariant.ClinvarSignificanceEnum.PATHOGENIC, 0.02, CohortVariant.PlofEnum.HC),
        annotatedVariant(
            "8-11708621-G-T", "Splice site", "p.?", CohortVariant.AouSubpopulationEnum.EAS, 0.004, 128, 32140,
            CohortVariant.GnomadSubpopulationEnum.EAS, 0.004, 40, 10002, CohortVariant.ClinvarSignificanceEnum.VUS,
            0.77, CohortVariant.PlofEnum.HC),
        annotatedVariant(
            "8-11708629-T-A", "Missense", "p.Ser130Arg", CohortVariant.AouSubpopulationEnum.SAS, 0.005, 107, 21428,
            CohortVariant.GnomadSubpopulationEnum.SAS, 0.005, 24, 4838, CohortVariant.ClinvarSignificanceEnum.VUS,
            0.08, null),
        annotatedVariant(
            "8-11708637-A-C", "Missense", "p.Lys133Thr", CohortVariant.AouSubpopulationEnum.EUR, 0.0733, 37954,
            517466, CohortVariant.GnomadSubpopulationEnum.NFE, 0.0733, 4989, 68058,
            CohortVariant.ClinvarSignificanceEnum.BENIGN, 0.01, null),
        annotatedVariant(
            "8-11708645-CGGGG-C", "Frameshift", "p.Gly136fs", CohortVariant.AouSubpopulationEnum.OTH, 0.005, 486,
            96422, null, null, null, null, CohortVariant.ClinvarSignificanceEnum.PATHOGENIC, 0.08,
            CohortVariant.PlofEnum.HC),
        annotatedVariant(
            "8-11708653-A-G", "Nonsense", "p.Trp139Ter", CohortVariant.AouSubpopulationEnum.EUR, 0.0033, 1707,
            517466, CohortVariant.GnomadSubpopulationEnum.NFE, 0.0033, 225, 68058,
            CohortVariant.ClinvarSignificanceEnum.BENIGN, 0.02, null),
        annotatedVariant(
            "8-11708661-C-T", "Missense", "p.Pro142Leu", CohortVariant.AouSubpopulationEnum.AMR, 0.0045, 858,
            190702, CohortVariant.GnomadSubpopulationEnum.AMR, 0.0045, 69, 15294,
            CohortVariant.ClinvarSignificanceEnum.VUS, 0.05, null),
        annotatedVariant(
            "8-11708669-G-A", "Nonsense", "p.Glu145Ter", CohortVariant.AouSubpopulationEnum.EUR, 0.0008, 414,
            517466, CohortVariant.GnomadSubpopulationEnum.FIN, 0.0008, 8, 10488,
            CohortVariant.ClinvarSignificanceEnum.PATHOGENIC, 0.03, CohortVariant.PlofEnum.HC),
        annotatedVariant(
            "8-11708677-T-C", "Synonymous", "p.Ala148=", CohortVariant.AouSubpopulationEnum.EUR, 0.0612, 31669,
            517466, CohortVariant.GnomadSubpopulationEnum.NFE, 0.0612, 4165, 68058,
            CohortVariant.ClinvarSignificanceEnum.BENIGN, 0.01, null),
        annotatedVariant(
            "8-11708685-A-T", "Missense", "p.Asn151Tyr", CohortVariant.AouSubpopulationEnum.SAS, 0.0071, 152, 21428,
            CohortVariant.GnomadSubpopulationEnum.SAS, 0.007, 34, 4838, CohortVariant.ClinvarSignificanceEnum.VUS,
            0.11, null),
        annotatedVariant(
            "8-11708693-C-G", "Frameshift", "p.Val154fs", CohortVariant.AouSubpopulationEnum.AFR, 0.0024, 507,
            211058, CohortVariant.GnomadSubpopulationEnum.AFR, 0.0024, 100, 41488,
            CohortVariant.ClinvarSignificanceEnum.PATHOGENIC, 0.09, CohortVariant.PlofEnum.HC),
        annotatedVariant(
            "8-11708701-G-T", "Splice site", "p.?", CohortVariant.AouSubpopulationEnum.EAS, 0.0028, 90, 32140,
            CohortVariant.GnomadSubpopulationEnum.EAS, 0.0028, 28, 10002, CohortVariant.ClinvarSignificanceEnum.VUS,
            0.62, CohortVariant.PlofEnum.HC),
        annotatedVariant(
            "8-11708709-A-C", "Missense", "p.His157Pro", CohortVariant.AouSubpopulationEnum.EUR, 0.0389, 20130,
            517466, CohortVariant.GnomadSubpopulationEnum.NFE, 0.0389, 2647, 68058,
            CohortVariant.ClinvarSignificanceEnum.BENIGN, 0.02, null),
        annotatedVariant(
            "8-11708717-T-G", "Nonsense", "p.Tyr160Ter", CohortVariant.AouSubpopulationEnum.OTH, 0.0016, 154, 96422,
            CohortVariant.GnomadSubpopulationEnum.OTH, 0.0014, 3, 2094,
            CohortVariant.ClinvarSignificanceEnum.PATHOGENIC, 0.04, CohortVariant.PlofEnum.HC),
        annotatedVariant(
            "8-11708725-C-A", "Synonymous", "p.Gly163=", CohortVariant.AouSubpopulationEnum.AMR, 0.0524, 9993,
            190702, CohortVariant.GnomadSubpopulationEnum.AMR, 0.0524, 801, 15294,
            CohortVariant.ClinvarSignificanceEnum.BENIGN, 0.01, null),
        annotatedVariant(
            "8-11708733-G-C", "Missense", "p.Phe166Leu", CohortVariant.AouSubpopulationEnum.MID, 0.0067, 39, 5768,
            CohortVariant.GnomadSubpopulationEnum.ASJ, 0.0066, 22, 3324, CohortVariant.ClinvarSignificanceEnum.VUS,
            0.13, null),
        annotatedVariant(
            "8-11708741-A-G", "Frameshift", "p.Ile169fs", CohortVariant.AouSubpopulationEnum.EUR, 0.0004, 207,
            517466, CohortVariant.GnomadSubpopulationEnum.NFE, 0.0004, 27, 68058,
            CohortVariant.ClinvarSignificanceEnum.PATHOGENIC, 0.06, CohortVariant.PlofEnum.HC));
  }

  private static CohortVariant annotatedVariant(
      String variant,
      String classification,
      String proteinChange,
      CohortVariant.AouSubpopulationEnum aouSubpopulation,
      double aouAf,
      int aouAc,
      int aouAn,
      CohortVariant.GnomadSubpopulationEnum gnomadSubpopulation,
      Double gnomadAf,
      Integer gnomadAc,
      Integer gnomadAn,
      CohortVariant.ClinvarSignificanceEnum clinvarSignificance,
      double spliceAi,
      CohortVariant.PlofEnum plof) {
    boolean inGnomad = gnomadAf != null;
    return new CohortVariant()
        .variant(variant)
        .gene("GATA4")
        .annotated(true)
        .classification(classification)
        .proteinChange(proteinChange)
        .aouSubpopulation(aouSubpopulation)
        .aouAf(BigDecimal.valueOf(aouAf))
        .aouAc(aouAc)
        .aouAn(aouAn)
        .gnomadSubpopulation(gnomadSubpopulation)
        .gnomadAf(inGnomad ? BigDecimal.valueOf(gnomadAf) : null)
        .gnomadAc(gnomadAc)
        .gnomadAn(gnomadAn)
        .gnomadUrl(inGnomad ? "https://gnomad.broadinstitute.org/variant/" + variant : null)
        .clinvarSignificance(clinvarSignificance)
        .clinvarUrl("https://www.ncbi.nlm.nih.gov/clinvar/?term=" + variant)
        .spliceAi(BigDecimal.valueOf(spliceAi))
        .plof(plof);
  }

  private static List<FilteredVariant> filteredVariants() {
    return List.of(
        filteredVariantWithStats("8-11708582-C-T", "Missense", 1, 428, 0.0023, 0, 1, 0, 0.7),
        filteredVariantWithStats("8-11708590-G-GAA", "Frameshift", 32, 428, 0.0748, 4, 24, 2, 40.7),
        filteredVariantWithStats("8-11708598-T-C", "Synonymous", 21, 428, 0.0491, 1, 19, 0, 1.0),
        filteredVariantWithStats("8-11708605-A-G", "Missense", 3, 428, 0.007, 0, 3, 0, 1.1),
        filteredVariantWithStats("8-11708613-C-T", "Nonsense", 0, 428, 0.0, 0, 0, 0, 0.0),
        filteredVariantWithStats("8-11708621-G-T", "Splice site", 2, 428, 0.0047, 0, 2, 0, 1.2),
        filteredVariantWithStats("8-11708629-T-A", "Missense", 2, 428, 0.0047, 0, 2, 0, 0.9),
        filteredVariantWithStats("8-11708637-A-C", "Missense", 31, 428, 0.0724, 1, 29, 0, 1.0),
        filteredVariantWithStats("8-11708645-CGGGG-C", "Frameshift", 2, 428, 0.0047, 0, 2, 1, 0.9),
        filteredVariantWithStats("8-11708653-A-G", "Nonsense", 0, 428, 0.0, 0, 0, 0, 0.0),
        filteredVariantWithStats("8-11708661-C-T", "Missense", 2, 428, 0.0047, 0, 2, 0, 1.0),
        filteredVariantWithStats("8-11708669-G-A", "Nonsense", 1, 428, 0.0023, 0, 1, 1, 2.9),
        filteredVariantWithStats("8-11708677-T-C", "Synonymous", 26, 428, 0.0607, 1, 24, 0, 1.0),
        filteredVariantWithStats("8-11708685-A-T", "Missense", 3, 428, 0.007, 0, 3, 0, 1.0),
        filteredVariantWithStats("8-11708693-C-G", "Frameshift", 4, 428, 0.0093, 0, 4, 2, 3.9),
        filteredVariantWithStats("8-11708701-G-T", "Splice site", 1, 428, 0.0023, 0, 1, 0, 0.8),
        filteredVariantWithStats("8-11708709-A-C", "Missense", 17, 428, 0.0397, 0, 17, 0, 1.0),
        filteredVariantWithStats("8-11708717-T-G", "Nonsense", 0, 428, 0.0, 0, 0, 0, 0.0),
        filteredVariantWithStats("8-11708725-C-A", "Synonymous", 23, 428, 0.0537, 1, 21, 0, 1.0),
        filteredVariantWithStats("8-11708733-G-C", "Missense", 3, 428, 0.007, 0, 3, 0, 1.0),
        filteredVariantWithStats("8-11708741-A-G", "Frameshift", 3, 428, 0.007, 0, 3, 1, 17.5));
  }

  private static FilteredVariant filteredVariantWithStats(
      String variant,
      String classification,
      int cohortAc,
      int cohortAn,
      double cohortAf,
      int homozygotes,
      int heterozygotes,
      int clinvarPlpInTrans,
      double afRatio) {
    return new FilteredVariant()
        .variant(variant)
        .gene("GATA4")
        .classification(classification)
        .hasStats(true)
        .cohortAc(cohortAc)
        .cohortAn(cohortAn)
        .cohortAf(BigDecimal.valueOf(cohortAf))
        .homozygotes(homozygotes)
        .heterozygotes(heterozygotes)
        .clinvarPlpInTrans(clinvarPlpInTrans)
        .afRatio(BigDecimal.valueOf(afRatio));
  }

  private static FilteredVariant unfilteredVariant(String variant, String classification) {
    return new FilteredVariant()
        .variant(variant)
        .gene("GATA4")
        .classification(classification)
        .hasStats(false)
        .cohortAc(null)
        .cohortAn(null)
        .cohortAf(null)
        .homozygotes(null)
        .heterozygotes(null)
        .clinvarPlpInTrans(null)
        .afRatio(null);
  }
}
