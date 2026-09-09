package org.broadinstitute.variantinterpretation;

import com.google.cloud.bigquery.BigQuery;
import com.google.cloud.bigquery.Dataset;
import java.util.List;
import org.broadinstitute.variantinterpretation.api.SystemApi;
import org.broadinstitute.variantinterpretation.model.BigQueryStatus;
import org.broadinstitute.variantinterpretation.model.DataSourceVersion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SystemController implements SystemApi {

  private static final Logger log = LoggerFactory.getLogger(SystemController.class);

  private final BigQuery bigQuery;
  private final BigQueryProperties properties;

  public SystemController(BigQuery bigQuery, BigQueryProperties properties) {
    this.bigQuery = bigQuery;
    this.properties = properties;
  }

  @Override
  public ResponseEntity<BigQueryStatus> bigQueryStatus() {
    var status = new BigQueryStatus().dataset(properties.toString());
    try {
      Dataset dataset = bigQuery.getDataset(properties.dataset());
      if (dataset == null) {
        return ResponseEntity.ok(
            status.accessible(false).detail("Dataset does not exist, or is not visible to us."));
      }
      return ResponseEntity.ok(status.accessible(true));
    } catch (RuntimeException e) {
      log.warn("BigQuery access check failed for dataset {}", properties, e);
      return ResponseEntity.ok(status.accessible(false).detail(e.getMessage()));
    }
  }

  @Override
  public ResponseEntity<List<DataSourceVersion>> dataSourceVersions() {
    return ResponseEntity.ok(
        List.of(
            source("All of Us", "CDRv9", "https://www.researchallofus.org/"),
            source("gnomAD", "v3.1.2", "https://gnomad.broadinstitute.org/"),
            source("ClinVar", "2025-06-01", "https://www.ncbi.nlm.nih.gov/clinvar/"),
            source("SpliceAI", "v1.3", "https://github.com/Illumina/SpliceAI"),
            source("LOFTEE", "v1.0.3", "https://github.com/konradjk/loftee")));
  }

  private static DataSourceVersion source(String name, String version, String url) {
    return new DataSourceVersion().name(name).version(version).url(url);
  }
}
