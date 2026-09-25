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
import org.broadinstitute.variantinterpretation.model.TableStatus;
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
   * Checks that VIA can access all BigQuery tables.
   */
  @Override
  public ResponseEntity<BigQueryStatus> bigQueryStatus() {
    List<TableId> tables = new ArrayList<>();
    tables.add(properties.vatTable());
    ConditionLookupService.CDR_TABLES.forEach(t -> tables.add(properties.cdrTable(t)));

    List<TableStatus> statuses = tables.stream().map(this::check).toList();
    return ResponseEntity.ok(
        new BigQueryStatus()
            .tables(statuses)
            .accessible(statuses.stream().allMatch(TableStatus::getAccessible)));
  }

  private TableStatus check(TableId table) {
    var status = new TableStatus().table("%s.%s.%s".formatted(table.getProject(), table.getDataset(), table.getTable()));
    try {
      if (bigQuery.getTable(table) == null) {
        return status.accessible(false).detail("Table does not exist, or is not visible to user.");
      }
      return status.accessible(true);
    } catch (RuntimeException e) {
      log.warn("BigQuery access check failed for table {}", status.getTable(), e);
      return status.accessible(false).detail(e.getMessage());
    }
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

  private static DataSourceVersion source(String name, String version, String url) {
    return new DataSourceVersion().name(name).version(version).url(url);
  }
}
