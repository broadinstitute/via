package org.broadinstitute.variantinterpretation;

import com.google.cloud.bigquery.DatasetId;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Location of the BigQuery dataset and table backing variant search. */
@ConfigurationProperties(prefix = "bigquery")
public record BigQueryProperties(String projectId, String datasetId, String tableId) {

  /** The configured dataset, as the id type the BigQuery client expects. */
  public DatasetId dataset() {
    return DatasetId.of(projectId, datasetId);
  }

  /** Fully-qualified, backtick-quotable reference to the configured table, for use in SQL. */
  public String tableRef() {
    return "`%s.%s.%s`".formatted(projectId, datasetId, tableId);
  }

  @Override
  public String toString() {
    return projectId + ":" + datasetId;
  }
}
