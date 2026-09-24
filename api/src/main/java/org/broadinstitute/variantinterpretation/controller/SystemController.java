package org.broadinstitute.variantinterpretation.controller;

import com.google.cloud.bigquery.BigQuery;
import com.google.cloud.bigquery.TableId;
import java.util.ArrayList;
import java.util.List;

import org.broadinstitute.variantinterpretation.datasource.BigQueryProperties;
import org.broadinstitute.variantinterpretation.datasource.ConditionLookupService;
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

  /**
   * Checks every table VIA queries, not just their datasets: a readable dataset doesn't mean the
   * configured table is in it. Each table is checked even after one fails, so the detail names
   * everything that's missing at once.
   */
  @Override
  public ResponseEntity<BigQueryStatus> bigQueryStatus() {
    List<TableId> tables = new ArrayList<>();
    tables.add(properties.vatTable());
    ConditionLookupService.CDR_TABLES.forEach(t -> tables.add(properties.cdrTable(t)));

    List<String> failures = new ArrayList<>();
    for (TableId table : tables) {
      String ref = name(table);
      try {
        if (bigQuery.getTable(table) == null) {
          failures.add(ref + ": does not exist, or is not visible to us");
        }
      } catch (RuntimeException e) {
        log.warn("BigQuery access check failed for table {}", ref, e);
        failures.add(ref + ": " + e.getMessage());
      }
    }

    var status =
        new BigQueryStatus()
            .tables(tables.stream().map(SystemController::name).toList())
            .accessible(failures.isEmpty());
    if (!failures.isEmpty()) {
      status.detail(String.join("; ", failures));
    }
    return ResponseEntity.ok(status);
  }

  // TODO VIA-47: right now these data source versions are hardcoded (and not entirely accurate)
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

  private static String name(TableId table) {
    return "%s.%s.%s".formatted(table.getProject(), table.getDataset(), table.getTable());
  }

  private static DataSourceVersion source(String name, String version, String url) {
    return new DataSourceVersion().name(name).version(version).url(url);
  }
}
