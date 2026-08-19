package org.broadinstitute.variantinterpretation;

import java.util.List;
import org.broadinstitute.variantinterpretation.api.DataSourceVersionsApi;
import org.broadinstitute.variantinterpretation.model.DataSourceVersion;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DataSourceVersionsController implements DataSourceVersionsApi {

  @Override
  public ResponseEntity<List<DataSourceVersion>> dataSourceVersions() {
    return ResponseEntity.ok(
        List.of(
            source("All of Us", "CDRv8", "https://www.researchallofus.org/"),
            source("gnomAD", "v3.1.2", "https://gnomad.broadinstitute.org/"),
            source("ClinVar", "2025-06-01", "https://www.ncbi.nlm.nih.gov/clinvar/"),
            source("SpliceAI", "v1.3", "https://github.com/Illumina/SpliceAI"),
            source("LOFTEE", "v1.0.3", "https://github.com/konradjk/loftee")));
  }

  private static DataSourceVersion source(String name, String version, String url) {
    return new DataSourceVersion().name(name).version(version).url(url);
  }
}
